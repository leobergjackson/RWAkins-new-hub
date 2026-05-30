// Built by vsrupeshkumar
import { Connection } from "@arbitrum-sepolia/web3.js";
import { env } from "./env.js";

export const connection = new Connection(env.ETHANA_RPC_URL, "confirmed");
