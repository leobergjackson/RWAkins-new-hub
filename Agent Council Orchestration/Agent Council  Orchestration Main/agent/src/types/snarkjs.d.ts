declare module 'snarkjs' {
  interface Curves {
    getCurveFromName(name: string): Promise<any>;
  }
  const curves: Curves;

  interface Groth16 {
    fullProve(
      input: Record<string, string | number | bigint>,
      wasmFile: string,
      zkeyFile: string,
    ): Promise<{ proof: Groth16Proof; publicSignals: string[] }>;

    verify(
      verificationKey: Record<string, unknown>,
      publicSignals: string[],
      proof: Groth16Proof,
    ): Promise<boolean>;
  }

  interface Groth16Proof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  const groth16: Groth16;

  export { curves, groth16 };
  export type { Groth16Proof };
}
