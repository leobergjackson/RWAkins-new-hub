import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import fs from 'fs';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import validatorsRouter from './routes/validators.js';
import filesRouter from './routes/files.js';
import profileRouter from './routes/profile.js';
import {
  insertFileRecord,
  listFilesByDid,
  getFileRecord,
  registerDid,
  saveDeathStatus,
  getDeathStatus,
} from './lib/dataStore.js';
import { uploadEncryptedFile, downloadEncryptedFile } from './lib/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
console.log("🔍 ENV CHECK:");
console.log("QIE_RPC_URL:", process.env.QIE_RPC_URL);
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY?.slice(0,8) + "..."); // don't expose full key
console.log("VAULT_ADDRESS:", process.env.VAULT_ADDRESS);

// --- Contract helper (LegacyVault) ---
let LegacyVaultAbi = null;
try {
  const abiPath = join(__dirname, 'abi', 'LegacyVault.json');
  const parsedAbi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
  LegacyVaultAbi = Array.isArray(parsedAbi) ? parsedAbi : parsedAbi?.abi;
  if (!LegacyVaultAbi) {
    throw new Error('LegacyVault ABI file missing ABI array');
  }
  console.log(`✅ Loaded LegacyVault ABI (${LegacyVaultAbi.length} entries)`);
} catch (e) {
  console.error('Failed to load LegacyVault ABI:', e.message);
  LegacyVaultAbi = null;
}

const rpcUrl = process.env.QIE_RPC_URL;
const pk = process.env.PRIVATE_KEY;
const vaultAddr = process.env.VAULT_ADDRESS;

function getVaultContract() {
  if (!rpcUrl || !pk || !vaultAddr || !LegacyVaultAbi) {
    throw new Error('Missing RPC/PRIVATE_KEY/VAULT_ADDRESS or ABI for LegacyVault');
  }
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(pk, provider);
  return new Contract(vaultAddr, LegacyVaultAbi, signer);
}

const app = express();
app.use(cors());
app.use(express.json());

const storageRoot = join(process.cwd(), 'backend', 'storage');
const uploadTmpDir = join(storageRoot, 'tmp');
if (!fs.existsSync(uploadTmpDir)) {
  fs.mkdirSync(uploadTmpDir, { recursive: true });
}

const upload = multer({ dest: uploadTmpDir });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { ownerDid } = req.body;
    const { cid } = req.body;
    const metaStr = req.body.meta;

    if (!file || !metaStr || !ownerDid) {
      return res.status(400).json({ ok: false, error: 'Missing file/meta/ownerDid' });
    }

    let meta = null;
    try {
      meta = JSON.parse(metaStr);
    } catch (err) {
      return res.status(400).json({ ok: false, error: 'Invalid meta JSON' });
    }
    const title = meta.title || '';
    const description = meta.description || '';
    const id = nanoid();
    const filename = `${id}.enc`;
    const storedPath = `${ownerDid}/${filename}`;

    try {
      await uploadEncryptedFile(file.path, storedPath);
    } finally {
      await fs.promises.unlink(file.path).catch(() => {});
    }

    const record = {
      ownerDid,
      storedPath,
      storagePath: storedPath,
      meta,
      title,
      description,
      originalName: meta.originalName,
      cryptoMeta: meta.cryptoMeta,
      cid: cid || null,
      anchored: false,
      timestamp: new Date().toISOString(),
    };

    await insertFileRecord(record);

    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Upload failed' });
  }
});

app.get('/api/files', async (req, res) => {
  const did = req.query.did;
  if (!did) return res.status(400).json([]);
  const list = await listFilesByDid(did);
  res.json(list);
});

app.get('/api/file/:id', async (req, res) => {
  const { id } = req.params;
  const as = req.query.as;
  if (as !== 'encrypted') {
    return res.status(400).json({ error: 'Only as=encrypted is supported for now' });
  }
  const record = await getFileRecord(id);
  if (!record) return res.status(404).json({ error: 'Not found' });

  const storagePath = record.storagePath || record.storedPath;
  if (!storagePath) return res.status(500).json({ error: 'File storage path missing' });

  try {
    const buffer = await downloadEncryptedFile(storagePath);
    const downloadName = record.meta?.originalName || `${id}.enc`;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.attachment(downloadName);
    return res.send(buffer);
  } catch (err) {
    console.error('Encrypted download failed:', err.message);
    return res.status(500).json({ error: 'Download failed' });
  }
});

app.post('/api/register-did', async (_req, res) => {
  const did = `did:eternavault:${nanoid(10)}`;
  await registerDid(did);
  res.json({
    did,
    note: 'QIE on-chain mapping will go here',
    sampleChainResponse: {},
  });
});

app.post('/api/notify-death', async (req, res) => {
  const { did } = req.body || {};
  if (!did) return res.status(400).json({ error: 'did is required' });

  const statusPayload = {
    deceased: true,
    markedAt: new Date().toISOString(),
  };
  await saveDeathStatus(did, statusPayload);

  // Attempt on-chain markDeceased
  try {
    const contract = getVaultContract();
    const tx = await contract.markDeceased();
    console.log('markDeceased tx hash:', tx.hash);
    await tx.wait();
    statusPayload.txHash = tx.hash;
    statusPayload.chain = 'QIEMainnet';
    await saveDeathStatus(did, statusPayload);
    return res.json({ ok: true, txHash: tx.hash });
  } catch (err) {
    console.error('markDeceased on-chain failed:', err);
    // Still return ok locally, but include error metadata
    return res.json({ ok: true, onChain: false, error: 'On-chain markDeceased failed', details: err.message });
  }
});

app.get('/api/simulate-unlock', async (req, res) => {
  const heir = req.query.heir;
  const did = req.query.did;

  // Require DID from the client
  if (!did) {
    return res.json({ allowed: false, files: [] });
  }

  // Fetch only this DID's files
  const files = await listFilesByDid(did);

  let allowed = false;
  if (heir) {
    try {
      const contract = getVaultContract();
      const can = await contract.canAccess(heir);
      allowed = !!can;
    } catch (err) {
      console.error('canAccess check failed:', err);
      allowed = false;
    }
  }

  // Only return files for this DID if contract allows
  const result = allowed ? files : [];
  return res.json({ allowed, files: result });
});

// Death status route — returns local + on-chain info if present
app.get('/api/death-status', async (req, res) => {
  const did = req.query.did || 'demo-owner';
  const status = await getDeathStatus(did);
  res.json(status || { deceased: false });
});

app.post('/api/register-heir', async (req, res) => {
  const { heir } = req.body || {};
  if (!heir) return res.status(400).json({ ok: false, error: 'Missing heir address' });

  try {
    const contract = getVaultContract();
    const tx = await contract.registerHeirs([heir]);
    console.log('registerHeirs tx:', tx.hash);
    await tx.wait();

    res.json({
      ok: true,
      heir,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error('registerHeirs failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/generate-story', async (req, res) => {
  try {
    const { did, memory } = req.body || {};
    if (!did) return res.status(400).json({ ok: false, success: false, error: 'Missing DID' });

    const files = await listFilesByDid(did);

    if (!files.length) {
      return res.json({ ok: false, success: false, message: 'No files available to summarize.' });
    }

    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_KEY) {
      return res.status(500).json({ ok: false, success: false, message: 'AI story unavailable.' });
    }

    const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free';

    let aiPrompt;
    if (memory && memory.id) {
      const linkedRecord = files.find((file) => file.id === memory.id);
      const memoryTitle = memory?.title || linkedRecord?.title || linkedRecord?.meta?.originalName || 'Untitled Memory';
      const memoryDescription = memory?.description || linkedRecord?.description || 'No description provided.';
      const snippet = memory?.snippet || '';
      aiPrompt = `You are an empathetic archivist crafting a respectful legacy note. Summarize only the facts provided without inventing new details.\nTitle: ${memoryTitle}\nDescription: ${memoryDescription}\nSnippet: ${snippet || 'N/A'}\nFocus on why this moment matters to loved ones.`;
    } else {
      const summaryData = files.map((file) => ({
        filename: file.meta?.originalName,
        timestamp: file.timestamp,
        type: file.meta?.originalName?.split('.').pop() || 'unknown',
        title: file.title || null,
        description: file.description || null,
      }));
      aiPrompt = `You are an empathetic archivist crafting a respectful multi-memory legacy note. Use only the facts provided below and avoid inventing details.\nMemories:\n${JSON.stringify(summaryData, null, 2)}\nTone: warm, reflective, respectful.`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://github.com/Faleesha-Zaeen/EternaVault',
        'X-Title': process.env.OPENROUTER_TITLE || 'eternaVault',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You craft heartfelt memorial summaries from provided metadata only.' },
          { role: 'user', content: aiPrompt },
        ],
        temperature: 0.6,
        max_tokens: 600,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter error', response.status, data);
      return res.status(502).json({ ok: false, success: false, message: 'AI story unavailable.' });
    }

    const rawMessage = data.choices?.[0]?.message;
    let story = '';

    if (rawMessage) {
      if (typeof rawMessage === 'string') {
        story = rawMessage.trim();
      } else if (typeof rawMessage?.content === 'string') {
        story = rawMessage.content.trim();
      } else if (Array.isArray(rawMessage?.content)) {
        story = rawMessage.content
          .map((chunk) => chunk?.text || chunk?.content || '')
          .join('\n')
          .trim();
      }
    }

    if (!story) {
      console.warn('OpenRouter returned no text', data);
      return res.json({ ok: false, success: false, message: 'AI story unavailable.' });
    }

    return res.json({ ok: true, success: true, story });
  } catch (err) {
    console.error('generate-story failed:', err);
    return res.status(500).json({ ok: false, success: false, message: 'AI story unavailable.' });
  }
});

// Validator routes
app.use('/api/validators', validatorsRouter);

// File / anchoring routes
app.use('/api', filesRouter);

// Tokenization profile routes
app.use('/api/profile', profileRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'EternaVault API', version: '1.0.0' });
});

const port = process.env.BACKEND_PORT || 4000;
app.listen(port, () => {
  console.log(`EternaVault backend listening on http://localhost:${port}`);
});

export default app;
