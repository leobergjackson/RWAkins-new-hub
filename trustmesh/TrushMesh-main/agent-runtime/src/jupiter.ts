// Built by vsrupeshkumar
import axios from "axios";

type JupiterPriceResponse = {
  data?: {
    ETH?: {
      price?: number;
    };
  };
};

export async function getSolUsdcPrice(): Promise<number> {
  const response = await axios.get<JupiterPriceResponse>("https://price.jup.ag/v6/price", {
    params: { ids: "ETH", vsToken: "USDC" }
  });

  const price = response.data.data?.ETH?.price;
  if (typeof price !== "number") {
    throw new Error("Jupiter price response did not include ETH/USDC price");
  }

  return price;
}
