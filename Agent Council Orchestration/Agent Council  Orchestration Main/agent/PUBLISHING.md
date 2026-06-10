# Publishing AeroFyta Agent to npm

## Prerequisites
- Node.js 22+
- npm account (free at https://www.npmjs.com/signup)

## Steps

1. Login to npm:
   ```bash
   npm login
   ```

2. Build the package:
   ```bash
   npm run build
   ```

3. Verify what will be published:
   ```bash
   npm pack --dry-run
   ```

4. Publish:
   ```bash
   npm publish
   ```

5. Verify on npm:
   ```
   https://www.npmjs.com/package/aerofyta-agent
   ```

## After Publishing

Anyone in the world can now:
```bash
npm install aerofyta-agent
```

And use it:
```typescript
import { createAeroFytaAgent } from 'aerofyta-agent';

const agent = await createAeroFytaAgent({
  seed: 'twelve word seed phrase...',
});

await agent.tip('0x...', 0.01);
```

## Version Updates

To publish updates:
```bash
npm version patch   # 1.0.0 -> 1.0.1
npm publish
```
