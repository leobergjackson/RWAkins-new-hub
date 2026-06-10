## AREA 1: Cross-Entity Contagion Propagation in Credit Scoring

### PART A — PRIOR ART RESEARCH  
(a) **Academic Papers:**  Key foundational papers include Allen & Gale (2000) on financial contagion【105†L13-L16】, Eisenberg & Noe (2001) on systemic risk networks【7†L93-L97】, Vasicek (2002) on asymptotic loan portfolio loss (Risk 2002)【16†L1496-L1500】, and Gai & Kapadia (2010) on contagion in financial networks【31†L4221-L4223】. Li (2000) introduced the Gaussian copula model for default correlation (J. Fixed Income 2000). These works provide the mathematical framework (network contagion models, copulas, portfolio VaR) relevant to contagion-adjusted credit scoring.  
(b) **Patents:**  We found no patents specifically on credit-score contagion. Related patents include US 12,316,790 B2 (“Fast robust oracles via DAOs”) which describes DAO-controlled oracle aggregation with robust outlier filtering【57†L246-L254】, and US 12,368,652 (“Distributed oracle agreement system”) which discloses clustering of oracle data for consensus【73†L13-L15】. Also US 2020/0192770 A1 describes hierarchical weighted consensus (clustered representatives with initialized weights)【72†L25-L33】. These focus on generic decentralized data aggregation, not credit contagion.  
(c) **DeFi/TradFi Systems:**  No DeFi protocol currently implements on-chain credit contagion. Decentralized credit oracles (e.g. Chainlink, Band) weight by stake, not cross-issuer shocks. Traditional credit agencies do not auto-adjust one borrower’s score based on another’s failure in real time.  
(d) **Novelty Assessment:**  The idea of *on-chain*, behavioral credit contagion appears genuinely novel. Classical models exist (Allen–Gale networks【105†L13-L16】), but no protocol ties automatic credit score drifts to correlated defaults via smart contracts. Existing oracles do not encode cross-entity contagion. Thus we believe novelty is strong.  
(e) **Mathematical Framework:**  Key foundations are Gaussian copula models (Li 2000) for correlated defaults, network cascade models (Allen & Gale 2000)【105†L13-L16】, portfolio loss distributions (Vasicek 2002)【16†L1496-L1500】, and network clearing (Eisenberg–Noe 2001)【7†L93-L97】. These provide the formulas (joint default prob, contagion propagation) on which on-chain contagion coefficients could be built.

### PART B — 4 INNOVATION IDEAS

#### IDEA 1.1: **Copula Score Adjustment**  
→ *MECHANISM:* A smart-contract oracle continuously fits a Gaussian copula to historical score movements among related entities (shared custodian/sector). When Entity A’s score suddenly drops, the contract computes the copula-implied conditional default probability for Entity B and applies a proportional reduction to B’s score in real time. Correlation parameters and copula tail probabilities are updated on-chain.  
→ *MATHEMATICAL CORE:* One-factor Gaussian copula【16†L1496-L1500】: conditional PD = Φ[(Φ⁻¹(PD_B) – ρ·Φ⁻¹(ΔPD_A)) / √(1–ρ²)], where ρ is learned on-chain.  
→ *PRIOR ART GAP:* No on-chain system updates credit scores via a copula model. Existing credit models are off-chain and static. Decentralized oracles do not implement copulas.  
→ *PATENT CLAIM DRAFT:* “A method for contagion-adjusted credit scoring, comprising: using on-chain historical score data to estimate a correlation parameter ρ, detecting a score drop for entity A, and adjusting the credit score of a related entity B according to a Gaussian-copula formula wherein B’s score is reduced based on ρ and A’s drop.”  
→ *FEASIBILITY:* Computation of Φ (normal CDF) and inverse requires approximation (Taylor series or lookup); feasible in Solidity but gas-intensive. Requires storing minimal historical scores and periodically estimating ρ off-chain or with on-chain regression.

#### IDEA 1.2: **Network Cascade Dampening**  
→ *MECHANISM:* Represent entities as nodes in an on-chain graph (edges for shared custodian/jurisdiction). When an entity’s score drops beyond a threshold, the contract initiates a “cascade”: it reduces scores of its neighbors by a fraction α (the edge weight), then recursively dampens further neighbors with a factor (e.g. α·β for next hop, 0<β<1). The process is deterministic and bounded by a stopping rule (score or distance).  
→ *MATHEMATICAL CORE:* Network diffusion / cascade models (Allen–Gale 2000)【105†L13-L16】: score_B ← score_B · (1 – α·ΔA) and iterate. Effectively a damped percolation or matrix exponential of adjacency.  
→ *PRIOR ART GAPS:* No on-chain credit protocol uses graph-based recursive score propagation. Existing “risk graphs” are offline. No patent covers recursive smart-contract propagation of defaults.  
→ *PATENT CLAIM DRAFT:* “A method for propagating credit score adjustments on-chain, comprising: storing a graph of entities and weighted edges, detecting a first entity’s score decline by Δ, and for each connected entity recursively reducing its score by a decay factor times Δ where the decay is dampened with distance, thereby propagating contagion.”  
→ *FEASIBILITY:* Solidity can update linked lists/maps of neighbor nodes. Recursive updates risk high gas for large networks, but constraints (max hops, thresholds) can cap cost. Storage of graph edges is straightforward.

#### IDEA 1.3: **Time-Decay Contagion Oracle**  
→ *MECHANISM:* Introduce a contagion coefficient on each entity pair that decays over time. On each score drop event, the contract applies an immediate score hit to connected entities, scaled by a “shock factor”. Thereafter, their contagion exposures exponentially decay (half-life). This ensures one shock does not permanently lower all scores. The contract tracks last shock timestamps and computes decayed exposure dynamically.  
→ *MATHEMATICAL CORE:* Exponential decay: exposure(t) = exposure₀·e^(–λ·t). Score impact = α·exp(–λ·Δt).  
→ *PRIOR ART GAPS:* Time-decay damping of contagion is not used in credit score contracts. No known oracle self-attenuates shock effects on-chain.  
→ *PATENT CLAIM DRAFT:* “A method for adjusting related credit scores with time-decaying contagion, comprising: upon an entity’s default trigger, applying an immediate score reduction to correlated entities with contagion factor α; and subsequently reducing the contagion factor according to an exponential decay function over elapsed time, thereby restoring scores over time.”  
→ *FEASIBILITY:* Very feasible: store timestamp of last contagion event per pair, update via on-chain math (requires exp or approximate). Gas is modest.

#### IDEA 1.4: **Custodian Spillover Index**  
→ *MECHANISM:* A smart contract maintains *custodian spillover scores*. Each entity’s credit score is adjusted not just by direct correlations but by a *custodian-level contagion index*: when any entity under custodian X drops, all other entities of X are penalized proportionally to their deposit size or exposure share. This captures the idea that a custodian failure affects all its clients.  
→ *MATHEMATICAL CORE:* Weighted average contamination: Score_B ← Score_B – (w_B / Σw_A)·(Δ_score_A), where weights reflect asset share with custodian.  
→ *PRIOR ART GAPS:* No prior on-chain patent implements a spillover index keyed on custodians (or geographic category). Traditional risk models are entity-specific or sector, not coded into smart contracts.  
→ *PATENT CLAIM DRAFT:* “A method for on-chain contagion adjustment comprising: grouping entities by a common custodian, detecting a significant score drop in entity A, and automatically reducing scores of other entities sharing that custodian by an amount proportional to their exposure weight, thereby enforcing a custodian-level contagion.”  
→ *FEASIBILITY:* Straightforward with Solidity mappings by custodian. Only requires tracking group membership and exposures. Gas depends on number of affected entities (could iterate or emit events).

## AREA 2: Historical Accuracy-Weighted Consensus for Financial Event Attestation

### PART A — PRIOR ART RESEARCH  
(a) **Academic Papers:** Fundamental work includes Brier (1950) on probability forecast verification【52†L21-L24】 and Clemen & Winkler (1999) on combining expert probability distributions【50†L91-L96】, which establish proper scoring and aggregation. PageRank (Brin & Page 1998) for iterative reputation scoring【77†L83-L87】 and Bayesian credibility updating (e.g. DeGroot’s consensus) are relevant.  A recent applied example is Ordoñez et al. (2025) on multi-level weighted voting for oracle data quality【81†L143-L151】【81†L152-L160】, introducing a model that weights data sources by historical reliability.  
(b) **Patents:**  We found WO 2019/126385 A1 (proof-of-stake oracle) which assigns *quality ratings* to oracles【80†L7-L10】 but based on staking rather than empirically measured accuracy. US 12,316,790 B2 (DAO-based oracle) and US 12,368,652 (distributed oracle consensus)【57†L246-L254】【73†L13-L15】 focus on robust data aggregation (mean, drop extremes) but not on weighting by past accuracy. No existing patent implements Brier-score weighting.  
(c) **DeFi/TradFi Systems:**  No DeFi oracle currently uses historical accuracy as vote weight. Chainlink and Band use token stake. MakerDAO’s oracle monitors price consistency but not oracle reputation. Prediction markets (Augur) have reputational systems (REP token) but do not compute attestor weights from past outcomes via Brier scores. Traditional consensus (e.g. juried decisions) sometimes factor in track record, but this is not automated on-chain.  
(d) **Novelty Assessment:**  Accuracy-weighted voting is novel in the blockchain context. Although theory (proper scoring) is known【52†L21-L24】【50†L91-L96】, no on-chain protocol weights votes by empirical accuracy per event type. Thus ideas here are highly novel.  
(e) **Mathematical Framework:**  The Brier Score (mean squared error of probabilistic forecasts)【52†L21-L24】 is the core accuracy metric. Expert aggregation theory (Clemen & Winkler 1999)【50†L91-L96】 provides methods to combine weighted forecasts. Reputation flows like PageRank【77†L83-L87】 can underlie score propagation. Bayesian updating of reliability (e.g. Beta-Bernoulli updates) is a classic framework. All these supply the formulaic basis for weighting attestors by precision.

### PART B — 4 INNOVATION IDEAS

#### IDEA 2.1: **Brier Reputation Oracle**  
→ *MECHANISM:* Each attestor’s on-chain history of binary attestation outcomes is tracked. After each event with known outcome, the oracle computes that attestor’s Brier score (squared error) on relevant event type. In future consensus votes, each attestor’s vote weight is inversely related to its cumulative Brier score. Thus consistently accurate attestors have higher influence. Weights are updated on-chain after each attestation round.  
→ *MATHEMATICAL CORE:* Brier score: \(B = \frac{1}{N}\sum (p_i - o_i)^2\). Weight ∝ 1/(1+B).  
→ *PRIOR ART GAP:* No existing oracle uses on-chain Brier scoring. Traditional oracles ignore past accuracy, and no patent covers automated on-chain Brier-weighted voting.  
→ *PATENT CLAIM DRAFT:* “A method for oracle consensus with accuracy-weighted voting, comprising: storing, on-chain, each attestor’s past probability forecasts and actual outcomes; computing, after each event, each attestor’s Brier score; and in subsequent votes, weighting each attestor’s vote inversely to its historical Brier score, thereby favoring higher-accuracy attestors.”  
→ *FEASIBILITY:* Straightforward to implement: maintain mappings of outcome history (packed bits or counts), compute Brier via arithmetic (minimally complex). Gas cost grows with event history length but can use rolling averages. Solidity can handle fixed-point arithmetic for probabilities.

#### IDEA 2.2: **Bayesian Trust Update**  
→ *MECHANISM:* Model each attestor’s reliability as a Beta distribution. For each attested event, if the attestor’s binary outcome is correct, increment its “success” count; if incorrect, increment “failure” count. On-chain, compute the expected probability of being correct (α/(α+β)). Use this expected value as the attestor’s vote weight in future. This naturally downweights poor performers and smoothly updates trust.  
→ *MATHEMATICAL CORE:* Beta-Bernoulli update: if prior (α,β), after success α←α+1, failure β←β+1. Weight = α/(α+β).  
→ *PRIOR ART GAPS:* No on-chain oracle uses a Bayesian reliability score in consensus. Existing voting schemes use fixed stake or reputation keys, not explicit Bayesian counts.  
→ *PATENT CLAIM DRAFT:* “A method for adaptive oracle voting, comprising: for each attestor, storing a pair (α,β) of on-chain counters; upon each attestation, updating the attestor’s (α,β) based on match/mismatch with actual outcome; and assigning each attestor’s future vote a weight proportional to α/(α+β), thereby biasing consensus toward historically reliable attestors.”  
→ *FEASIBILITY:* Highly feasible. Only integer counters (α,β) per attestor need storage. Weight computation is just a division of integers. Gas overhead is negligible per update.

#### IDEA 2.3: **Temporal Decay Weighting**  
→ *MECHANISM:* Assign each attestor an accuracy score that decays over time. After each correct attestation, boost the score; after errors, penalize it. Continuously apply an exponential decay factor so that older events have less influence. This yields a trust score reflecting recent performance. The attestor’s weight in consensus is this decayed score.  
→ *MATHEMATICAL CORE:* Score_t = λ·Score_{t-1} + (1 if correct, –1 if incorrect), with 0<λ<1 (decay factor).  
→ *PRIOR ART GAPS:* Unlike simple averaging, no oracles adapt weights with a time-decay. No known protocol grants more credence to recent accuracy vs. older record.  
→ *PATENT CLAIM DRAFT:* “A method for oracle consensus comprising: maintaining, per attestor, a trust score that decays by a factor λ each time period; after each attestation, incrementing or decrementing the score based on correctness; and applying the current trust score as the attestor’s vote weight in future consensus.”  
→ *FEASIBILITY:* Easy to implement: track a uint for each attestor. Decay can be achieved by periodic multiplication (if λ = 1/2, just bit-shift). This avoids large loops. Storage costs low.

#### IDEA 2.4: **Domain-Specific Accuracy Profiling**  
→ *MECHANISM:* Track each attestor’s accuracy separately for different event “domains” (e.g. weather vs. default events). On-chain, maintain a matrix of success/failure counts per attestor per domain. When a consensus is needed for a given domain, compute weights from the respective accuracy profile (using Brier or Bayesian method). Bootstrapping new domains can use global average until sufficient history.  
→ *MATHEMATICAL CORE:* As Idea 2.1/2.2 but indexed by domain: weight_{domain} = function of {outcomes_{domain}}.  
→ *PRIOR ART GAPS:* Generic reputation systems ignore domain. No DeFi oracle has event-type-aware weighting.  
→ *PATENT CLAIM DRAFT:* “A method for weighted consensus where each attestor maintains separate reliability statistics for multiple event types; for an attestation in a given domain, using the attestor’s historical accuracy in that domain to determine its vote weight, wherein unrelated historical errors do not affect domain-specific weight.”  
→ *FEASIBILITY:* Requires storing multi-dimensional arrays (attestor×domain). Feasible if number of domains is limited (could use mapping of mappings). On-chain storage grows but is manageable. No complex computation beyond counters.

## AREA 3: Real-Time Per-Depositor Concentration-Risk Yield Adjustment

### PART A — PRIOR ART RESEARCH  
(a) **Academic Papers:** The classic measure is the Herfindahl–Hirschman Index (HHI) (Herfindahl 1950; Hirschman 1945) – sum of squared shares【86†L171-L177】. Recent work generalizes HHI to account for asset correlations (Dvara Research 2015 discusses a “Generalized HHI” for correlated portfolios【86†L171-L177】). Regulatory literature (Basel, IMF) recommends HHI for concentration risk, but no on-chain papers exist.  
(b) **Patents:**  We found no patents on yield adjustment by depositor concentration. Patent searches did not reveal any mechanism that adjusts individual yield rates based on portfolio concentration metrics.  
(c) **DeFi/TradFi Systems:**  No DeFi protocol currently varies per-user yield by their deposit concentration. All protocols (Aave, Compound, Uni pools) pay uniform APYs to all depositors in a pool regardless of user-specific portfolio. In TradFi, concentration risk is managed at portfolio level (e.g. regulatory capital add-ons) but not automatically rewarded in rates.  
(d) **Novelty Assessment:**  Embedding an HHI-based adjustment into on-chain yields appears novel. Traditional risk-management systems do not perform per-investor yield adjustments based on diversification. This idea has no known prior art in DeFi or banking (where diversification is encouraged but not via yield).  
(e) **Mathematical Framework:**  Herfindahl–Hirschman index (HHI)【86†L171-L177】: HHI = ∑_i s_i², where s_i is depositor i’s share of total deposits. Generalized HHI (GHHI) accounts for correlations across asset classes (Dvara 2015). Other diversity measures (entropy index) could also apply. The basic HHI provides a penalty factor.

### PART B — 4 INNOVATION IDEAS

#### IDEA 3.1: **Portfolio HHI Yield Oracle**  
→ *MECHANISM:* Each depositor’s wallet is tracked across all pools of a protocol. The contract computes the depositor’s current HHI based on that wallet’s share of total deposits in each pool. The depositor’s yield rate in each pool is then adjusted by a monotonic function of HHI (e.g. lower yield if HHI high). This incentivizes users to spread assets. The calculation is realtime as deposits/withdrawals occur.  
→ *MATHEMATICAL CORE:* HHI = Σ (x_{i,p}/X_p)² across pools p (x_{i,p}=depositor’s stake, X_p=total in pool). Yield_i = baseYield · f(HHI), where f could be (1–HHI) or 1/√HHI.  
→ *PRIOR ART GAPS:* No protocol currently computes per-user HHI on-chain. Patent-free.  
→ *PATENT CLAIM DRAFT:* “A method for adjusting deposit yields comprising: for each depositor, calculating a diversification score as the sum of squared portfolio fractions (HHI) over all pools; and adjusting that depositor’s interest rate inversely to HHI, wherein more concentrated portfolios receive lower yields.”  
→ *FEASIBILITY:* Requires mapping of (user→deposits in each pool) and frequent HHI calculation. Feasible with up to hundreds of pools; gas scales with number of pools per user. HHI and squaring is simple arithmetic.

#### IDEA 3.2: **Correlation-Aware Yield Adjustment**  
→ *MECHANISM:* Extend the above by weighting pools by risk correlation. The contract stores a matrix of pairwise correlations among asset categories or pools. Depositor concentration is measured by a generalized HHI: Σ_{p,q} c_{p,q}·(share_{i,p}·share_{i,q}). Yield is penalized more if assets are highly correlated. E.g., two stablecoin pools may count as one for concentration if correlated.  
→ *MATHEMATICAL CORE:* Generalized HHI: ∑_{p,q} ω_{p,q} s_{i,p} s_{i,q}, where ω=correlation weights (from Dvara WP).  
→ *PRIOR ART GAPS:* No current system uses pool correlations in yield formulas.  
→ *PATENT CLAIM DRAFT:* “A method of diversification scoring comprising: storing pairwise correlation weights for asset pools; for each depositor, computing a concentration index = ∑_{p,q} ω_{p,q}·(depositor’s share in p)·(share in q); and adjusting yields inversely to this index, thereby penalizing correlated exposures.”  
→ *FEASIBILITY:* Requires storing a symmetric matrix of correlations (can be small if categorized). Computation is O(n²) in number of distinct pools the user participates in. Manageable if pool count is limited or correlations cached. Solidity loops can compute it.

#### IDEA 3.3: **Nonlinear HHI Penalty Curve**  
→ *MECHANISM:* Instead of linear scaling, use a calibrated nonlinear function for yield vs. HHI. For example, an S-shaped (logistic or piecewise) curve that heavily penalizes extreme concentration but is flatter near optimal diversification. The smart contract stores curve parameters and applies them to the computed HHI to determine yield multiplier. This allows gradual tapering up to a sharp penalty.  
→ *MATHEMATICAL CORE:* Yield factor = g(HHI), e.g. 1/(1+exp(k*(HHI–θ))).  
→ *PRIOR ART GAPS:* Current DeFi yields are linear. No patent for on-chain nonlinear yield adjustment by concentration.  
→ *PATENT CLAIM DRAFT:* “A method for incentive-based diversification comprising: computing each depositor’s concentration index (HHI); and mapping HHI through a nonlinear penalty function (such as logistic) to determine a yield adjustment factor, wherein yield decreases slowly up to a threshold and then rapidly for high HHI.”  
→ *FEASIBILITY:* Nonlinear functions can be implemented with a few arithmetic ops (e.g. approximate exp) or piecewise interpolation (cheaper). Solidity can handle modest complexity. 

#### IDEA 3.4: **Time-Weighted Diversification Incentive**  
→ *MECHANISM:* Adjust yield not only by static HHI but also by *time* spent diversified. The contract tracks how long a user maintains low HHI (above diversification threshold). A loyalty bonus gradually increases for sustained diversification. Conversely, if HHI spikes, immediate penalty is applied. This rewards both diversification and consistency.  
→ *MATHEMATICAL CORE:* Bonus = α·t_distilled where t_distilled = time in well-diversified state; penalty = β if HHI>threshold.  
→ *PRIOR ART GAPS:* No known on-chain yield model rewards duration of diversification.  
→ *PATENT CLAIM DRAFT:* “A method of yield adjustment comprising: continuously computing a depositor’s HHI; when HHI is below a threshold, incrementing a diversification time counter; and applying a yield bonus proportional to the counter, whereas if HHI exceeds the threshold, resetting the counter and reducing the yield.”  
→ *FEASIBILITY:* Requires per-user timer/storage to accumulate diversification time. Incrementing by block or day is easy. Gas cost minor (few SSTOREs per period).

## AREA 4: Multi-Horizon Default Probability Surface from Behavioral Signals

### PART A — PRIOR ART RESEARCH  
(a) **Academic Papers:**  Key credit-risk models include Merton’s structural model (1974) for default from equity as option【92†L7-L15】, Longstaff & Schwartz (1995) for term structure of credit spreads, and the Moody’s KMV Expected Default Frequency (EDF) methodology (Crosbie & Bohn 2003). Altman’s Z-score (1968) is a classical default indicator (though uses accounting data). Very recent work by Ghosh *et al.* (2025) introduces an “On-Chain Credit Risk (OCCR) Score” for wallets, a probabilistic PD analog【99†L2-L7】. No model yet provides a term-structure of PD purely from on-chain behavior, however.  
(b) **Patents:**  We found no patents on multi-horizon PD term structures from behavioral data. Typical credit-model patents assume market prices or financial statements (e.g. “PD term structure” appears only in generic software docs).  
(c) **DeFi/TradFi Systems:**  No DeFi oracle outputs multi-horizon PDs. Lending platforms like Aave use fixed risk categories (levels, not probabilities) and do not model horizon. Traditional credit bureaus compute single-score PDs not a surface.  
(d) **Novelty Assessment:**  Computing a short/medium/long PD surface on-chain from nontraditional data is novel. Even academically this is cutting-edge (see Ghosh et al. 2025, who only do one PD). We found no existing automation of term-structure PDs from alternative signals.  
(e) **Mathematical Framework:**  Underlying models include Merton’s option-based default model (Black–Scholes framework)【92†L7-L15】, multi-factor structural models, and extended formalisms like KMV (EDF approach). For term structures, the long-staff Schwartz model (1995) treats default event as a stochastic process. These yield formulas for PD at different horizons. One could also use logistic regression (as in empirical credit scoring) calibrated to on-chain features.  

### PART B — 4 INNOVATION IDEAS

#### IDEA 4.1: **Behavioral Bayesian PD Calibration**  
→ *MECHANISM:* Use a Bayesian updating framework for PD at multiple horizons. Define prior PDs (30d, 90d, 365d) for each entity (e.g. based on cohort). As on-chain events (e.g. missed payments, large withdrawals) occur, treat them as “evidence” and update the posterior PD surface. The Bayesian update rule (with likelihoods from historical data mapping events to defaults) adjusts short-term PD more sensitively than long-term PD, naturally yielding a surface.  
→ *MATHEMATICAL CORE:* Bayesian inference: Posterior PD_horizon ∝ Likelihood(event|default_horizon) · Prior.  
→ *PRIOR ART GAPS:* No on-chain oracle or contract applies Bayesian PD updating over horizons. Traditional PD models are offline.  
→ *PATENT CLAIM DRAFT:* “A method for multi-horizon default estimation comprising: initializing prior default probabilities at 30-, 90-, and 365-day horizons; on observing an on-chain behavioral signal (e.g. late payment), updating each horizon’s PD using Bayesian likelihood functions specific to that signal; and outputting the updated PD surface, thereby adjusting short-term PD more sharply.”  
→ *FEASIBILITY:* Requires storing priors and simple multiplication/addition. Bayesian updating formulas are lightweight. Off-chain or periodic calibration of likelihood functions is needed, but on-chain steps are multiplication and division (feasible).

#### IDEA 4.2: **Logistic Term-Structure Oracle**  
→ *MECHANISM:* Deploy a smart contract that estimates PDs via a logistic regression over on-chain features (transaction volume, debt usage, liquidity events). The contract is initialized with regression coefficients for each horizon (calibrated offline to backtest defaults). When new data arrives, it recomputes PD_h = 1/(1+exp(–(β0_h + Σ β_i · x_i))). Each horizon has its own β0_h intercept, allowing a term structure. The surface is published on-chain as three PD values.  
→ *MATHEMATICAL CORE:* Multi-horizon logistic model: \(PD_h = \sigma(\beta_{0,h} + \sum_i \beta_i x_i)\).  
→ *PRIOR ART GAPS:* On-chain regression for multi-horizon PD is new. No existing protocol uses logistic models with horizon-specific intercepts.  
→ *PATENT CLAIM DRAFT:* “A method for on-chain credit risk surface estimation comprising: storing a separate logistic regression (intercept + coefficients) for each time horizon; collecting a vector of on-chain behavioral features for an entity; computing for each horizon h a default probability PD_h = σ(β_{0,h}+∑β_i x_i); and outputting the trio (PD_30, PD_90, PD_365) as the entity’s default probability surface.”  
→ *FEASIBILITY:* Very feasible. Requires fixed-point math for σ (sigmoid). Coefficients (β) are stored constants. Multiplications and exp approximations are simple. The main limit is obtaining reliable β values, but those are offline.

#### IDEA 4.3: **Self-Calibrating Default Surface**  
→ *MECHANISM:* The protocol initially assumes some default surface (e.g. flat term structure). Each time a default actually occurs in the insured pool, the contract updates its model to better fit the realized horizon-specific default frequency. For example, if 30-day defaults often cascade into 90-day defaults, the surface updates via online gradient descent to reduce forecast error. Essentially, the contract solves an online learning problem to calibrate PD formula coefficients using realized defaults (reinforcement). Over time, the PD surface becomes self-calibrated.  
→ *MATHEMATICAL CORE:* Online convex optimization (e.g. adjusting logistic coefficients β with gradient descent), or EM updating in a latent PD model.  
→ *PRIOR ART GAPS:* No on-chain autonomous calibration of PD curves.  
→ *PATENT CLAIM DRAFT:* “A method for adaptive default term structure estimation comprising: maintaining parameters of a PD model (e.g. logistic or ML model) on-chain; upon observing actual default outcomes, computing the model’s prediction error for each horizon; updating the model parameters via a gradient-descent step (or Bayesian update) to reduce this error; and using the updated model for future PD surface outputs.”  
→ *FEASIBILITY:* Implementable using simple update rules. Each event triggers a few multiplications and additions to adjust parameters. Must limit learning rate to avoid oscillation. Gas cost is low per update.

#### IDEA 4.4: **Confidence-Bound Default Oracle**  
→ *MECHANISM:* Instead of point estimates, provide (PD, CI) for each horizon. The contract runs multiple scenario calibrations (e.g. high/low stress behavioral assumptions) deterministically and reports an interval [PD_low, PD_high]. For example, if on-chain signals fluctuate, compute two extreme PD surfaces using different weights on signals. This enables lending protocols to use a worst-case PD estimate.  
→ *MATHEMATICAL CORE:* Interval arithmetic or quantile approximation: PD_low = PD – k·σ; PD_high = PD + k·σ (for some error estimate σ of the model), or dual-model output.  
→ *PRIOR ART GAPS:* No on-chain protocol reports PD confidence bands. Lending systems currently use single values.  
→ *PATENT CLAIM DRAFT:* “A method for probabilistic default risk attestation comprising: computing a point default probability for each horizon from on-chain data; computing a secondary bound (e.g. upper confidence bound) for each PD; and outputting the default probability surface along with its confidence interval [PD_low, PD_high], enabling stress-testing of lending conditions.”  
→ *FEASIBILITY:* Feasible by running two computations per horizon. Requires minimal extra state (could reuse logistic values ± an offset). Gas roughly doubles, but still modest.

## AREA 5: Permissionless On-Chain Deterministic Actuarial Stress Testing

### PART A — PRIOR ART RESEARCH  
(a) **Academic Papers:**  Foundational methods include Li (2000) on the Gaussian copula for correlated default scenarios. Glasserman’s work on Monte Carlo for correlated credit (2003) provides theoretical approaches for such simulations. Actuarial stress-test frameworks (e.g. CCAR by Fed, EIOPA insurance stress tests) describe scenario generation and loss estimation. However, all are off-chain. EIOPA guidelines (no DOI) use copulas and weighted default scenarios, but not on-chain. Astin Working Papers discuss deterministic scenario testing (conceptual). No academic paper addresses *on-chain* stress testing directly.  
(b) **Patents:**  No patents found that describe an on-chain “stress test oracle”. Existing patents are either about consensus or oracle aggregation, not protocol-level solvency analysis.  
(c) **DeFi/TradFi Systems:**  No DeFi protocol provides a public stress-test function. Risk systems in TradFi (e.g. Bloomberg, Moody’s) do scenario analysis off-chain. Some DeFi dashboards display risk metrics, but nothing like a call-able, permissionless actuarial simulation on the blockchain.  
(d) **Novelty Assessment:**  A deterministic, permissionless on-chain stress test is highly novel. On-chain DCF oracles exist, but no system computes correlated portfolio losses on-chain for arbitrary scenarios. This is unaddressed prior art.  
(e) **Mathematical Framework:**  The obvious models are Gaussian copula (Li 2000) to generate correlated defaults, and deterministic approximations of Monte Carlo (e.g. Luby’s method, or rank-1 update). Actuarial formulas for multi-customer default (e.g. orthogonal polynomial approximations) could be used to avoid randomness. Vasicek (2002) asymptotic formula is a deterministic limit of copula MC. Also CLT or moment-matching (Glasserman) for approximating loss distributions.

### PART B — 4 INNOVATION IDEAS

#### IDEA 5.1: **Deterministic Copula Simulator**  
→ *MECHANISM:* Encode a one-factor Gaussian copula stress test as a smart contract function: given a user-supplied correlation matrix (via BAS attestation), the contract deterministically computes default outcomes by applying a fixed pseudo-random sequence (or analytic quantile formula). For example, for each entity use the quantile function φ⁻¹(u) for a fixed u (like u=0.5 for median stress) combined with correlation via Cholesky. The contract then calculates portfolio losses and the corresponding recovery rate and outputs a solvency certificate.  
→ *MATHEMATICAL CORE:* Gaussian copula integration: default_i = 1 if Φ⁻¹(U)+Σ terms > threshold. Using fixed U (e.g. hashing known constants) yields reproducible “stress”. Essentially a rank-based simulation with predetermined inputs, avoiding stochastic randomness.  
→ *PRIOR ART GAPS:* No on-chain implementation of copula simulation. The novelty is turning Monte Carlo into a deterministic function on blockchain.  
→ *PATENT CLAIM DRAFT:* “A method for deterministic on-chain stress testing, comprising: receiving a user-defined correlation matrix; generating default probabilities under a Gaussian copula using a fixed set of quantiles or seeds; computing resultant portfolio losses and investor recovery percentages under senior/junior tranching; and outputting the solvency results in a signed attestation.”  
→ *FEASIBILITY:* It requires fixed-point math for Gaussian quantiles and linear algebra (Cholesky) on-chain. Cholesky of large matrices may be gas-heavy, but could be limited to a few factors (rank-1 approximation). Requires publishing correlation matrix off-chain and feeding via attestation (BAS).

#### IDEA 5.2: **Moment-Matching Stress Model**  
→ *MECHANISM:* Instead of full simulation, the contract uses analytical moment-matching (e.g. Vasicek’s asymptotic formula) to approximate tail losses. For a given stress scenario (e.g. increase PDs by X, correlation by Y), it computes expected portfolio loss via a deterministic formula. This yields a quick, reproducible stress output. The formula could be a closed-form (like Vasicek’s inverse Gaussian CDF) or a low-order polynomial.  
→ *MATHEMATICAL CORE:* Vasicek (2002): Loss(α) = Φ((Φ⁻¹(α)–√ρΦ⁻¹(PD))/√(1–ρ)). Use for worst-case default α. Or moment-based approximations (mean+σ).  
→ *PRIOR ART GAPS:* No on-chain use of asymptotic formulas for stress. Current DeFi uses point oracles; this inverts a risk formula.  
→ *PATENT CLAIM DRAFT:* “A method for on-chain solvency analysis comprising: for each user-defined stress parameter, analytically computing the portfolio’s default distribution using a factor model (e.g. Vasicek formula) without simulation; determining the expected loss and recovery from these closed-form results; and publishing the solvency outcome deterministically.”  
→ *FEASIBILITY:* Straightforward math and CDF evaluation needed; Gas cost is low compared to loops. Must approximate CDF (Taylor or table). Works best for large portfolios (law of large numbers).

#### IDEA 5.3: **Aggregated Scenario Engine**  
→ *MECHANISM:* Allow any user to submit a scenario (set of correlated default triggers) which the contract then evaluates. The contract uses a fixed deterministic algorithm (e.g. a hash-derived “random” sequence that is actually deterministic) to sample dozens of correlated scenarios from the given copula, computes each outcome, averages them, and returns the precise aggregate loss. This is essentially on-chain Monte Carlo with pseudorandom but deterministic draws.  
→ *MATHEMATICAL CORE:* Quasi-Monte Carlo with fixed seeds + correlation (rank-1 lattice or low-discrepancy points in a copula).  
→ *PRIOR ART GAPS:* MC is avoided on-chain due to nondeterminism; using fixed seeds for reproducible “pseudo-MC” is new.  
→ *PATENT CLAIM DRAFT:* “A method for on-chain scenario analysis comprising: accepting a correlation/default scenario input; deterministically generating a set of sample outcomes via a fixed pseudorandom seed; for each sample, computing the protocol’s solvency and recovery; and aggregating results into a final on-chain stress report, wherein the process is reproducible by any observer.”  
→ *FEASIBILITY:* Must ensure all “random” numbers are deterministic (e.g. seeded by input). Gas heavy if many samples, but could limit to e.g. 10 draws to cover scenario variability. Each sample is a simple copula transformation (as in idea 5.1).

#### IDEA 5.4: **Probabilistic Collateral Certificate**  
→ *MECHANISM:* The contract computes a collateral adequacy certificate based on worst-case default correlation. Given current collateral and pending claims, it simulates the joint default of all borrowers (i.e. correlation=1) and computes the coverage ratio. This produces a deterministic “solvency certificate” (collateral sufficiency percentage) that anyone can verify. In effect, the contract stresses 100% correlation (very conservative) on current exposures.  
→ *MATHEMATICAL CORE:* Worst-case correlation portfolio loss = Σ (exposures if any default) and compute recovery.  
→ *PRIOR ART GAPS:* Using full-correlation stress on-chain is novel. No protocol auto-generates solvency certificates under extreme scenarios.  
→ *PATENT CLAIM DRAFT:* “A method for on-chain solvency attestation comprising: retrieving the protocol’s current exposures and collateral; assuming all exposures default simultaneously (perfect correlation scenario); calculating resulting investor recoveries; and outputting a collateral adequacy percentage, thereby providing a deterministic worst-case stress test.”  
→ *FEASIBILITY:* Very simple calculation (sum of exposures vs collateral). Gas minimal. It’s extreme but provides a guaranteed stress indicator.

## RANKING: Top 5 Patentable Ideas

1. **Idea 2.1 (Brier Reputation Oracle)** – *Novelty:* High (no prior art) *Specificity:* Very precise claim structure *Value:* Improves oracle reliability across DeFi (widely applicable) *Feasibility:* Straightforward math.  
2. **Idea 5.1 (Deterministic Copula Simulator)** – *Novelty:* Unique on-chain risk simulation *Specificity:* Concrete claim with Gaussian copula *Value:* Could integrate with any RWA protocol (real-time risk) *Feasibility:* Complex but doable for small pools.  
3. **Idea 1.1 (Copula Score Adjustment)** – *Novelty:* First on-chain credit contagion by copula *Specificity:* Clear claim using copula formula *Value:* Enhances behavioral credit scores across RWA issuers *Feasibility:* Mathematically intensive but implementable.  
4. **Idea 2.2 (Bayesian Trust Update)** – *Novelty:* No prior art on-chain Bayesian oracle weights *Specificity:* Precise (α,β update) *Value:* Lowers risk of oracle errors system-wide *Feasibility:* Easy to implement on solidity.  
5. **Idea 3.2 (Correlation-Aware Yield Adjustment)** – *Novelty:* First to adjust yield by correlated positions *Specificity:* Uses stored correlation matrix *Value:* Encourages risk-based diversification across pools *Feasibility:* Reasonable gas for moderate pool sizes.

Each of these ideas scores high on novelty and specificity, promises clear benefits to a DeFi RWA risk protocol (improved scoring accuracy, stronger oracles, aligned incentives), and is implementable within EVM constraints. They would form the strongest candidates for patent claims. 

