# Minimal Motivation of Natural Latents
by johnswentworth, David Lorell  -  15th Oct 2024

Suppose two Bayesian agents are presented with the same spreadsheet - IID samples of data in each row, a feature in each column. Each agent develops a generative model of the data distribution. We'll assume the two converge to the same predictive distribution, but may have different generative models containing different latent variables. We'll also assume that the two agents develop their models independently, i.e. their models and latents don't have anything to do with each other informationally except via the data. Under what conditions can a latent variable in one agent's model be faithfully expressed in terms of the other agent's latents?

Let’s put some math on that question.

The n “features” in the data are random variables X1,…,Xn. By assumption the two agents converge to the same predictive distribution (i.e. distribution of a data point), which we’ll call P[X1,…,Xn]. Agent j’s generative model Mj must account for all the interactions between the features, i.e. the features must be independent given the latent variables Λj in model Mj. So, bundling all the latents together into one, we get the high-level graphical structure:

which says that all features are independent given the latents, under each agent’s model.

Now for the question: under what conditions on agent 1’s latent(s) Λ1 can we guarantee that Λ1 is expressible in terms of Λ2, no matter what generative model agent 2 uses (so long as the agents agree on the predictive distribution P[X])? In particular, let’s require that Λ1 be a function of Λ2. (Note that we’ll weaken this later.) So, when is Λ1 guaranteed to be a function of Λ2, for any generative model M2 which agrees on the predictive distribution P[X]? Or, worded in terms of latents: when is Λ1 guaranteed to be a function of Λ2, for any latent(s) Λ2 which account for all interactions between features in the predictive distribution P[X]?

## The Main Argument

Λ1 must be a function of Λ2 for any generative model M2 which agrees on the predictive distribution. So, here’s one graphical structure for a simple model M2 which agrees on the predictive distribution:

In English: we take Λ2 to be X¯i, i.e. all but the ith feature. Since the features are always independent given all but one of them (because any random variables are independent given all but one of them), X¯i is a valid choice of latent Λ2. And since Λ1 must be a function of Λ2 for any valid choice of Λ2, we conclude that Λ1 must be a function of X¯i. Graphically, this implies

By repeating the argument, we conclude that the same must apply for all i:

Now we’ve shown that, in order to guarantee that Λ1 is a function of Λ2 for any valid choice of Λ2, and for Λ1 to account for all interactions between the features in the first place, Λ1 must satisfy at least the conditions:

… which are exactly the (weak) natural latent conditions, i.e. Λ1 mediates between all Xi’s and all information about Λ1 is redundantly represented across the Xi’s. From the standard Fundamental Theorem of Natural Latents, we also know that the natural latent conditions are almost sufficient[1]: they don’t quite guarantee that Λ1 is a function of Λ2, but they guarantee that Λ1 is a stochastic function of Λ2, i.e. Λ1 can be computed from Λ2 plus some noise which is independent of everything else (and in particular the noise is independent of X).

… so if we go back up top and allow for Λ1 to be a stochastic function of Λ2, rather than just a function, then the natural latent conditions provide necessary and sufficient conditions for the guarantee which we want.

## Approximation

Since we’re basically just invoking the Fundamental Theorem of Natural Latents, we might as well check how the argument behaves under approximation.

The standard approximation results allow us to relax both the mediation and redundancy conditions. So, we can weaken the requirement that the latents exactly mediate between features under each model to allow for approximate mediation, and we can weaken the requirement that information about Λ1 be exactly redundantly represented to allow for approximately redundant representation. In both cases, we use the KL-divergences associated with the relevant graphs in the previous sections to quantify the approximation. The standard results then say that Λ1 is approximately a stochastic function of Λ2, i.e. Λ2 contains all the information about X relevant to Λ1 to within the approximation bound (measured in bits).

The main remaining loophole is the tiny mixtures problem: arguably-small differences in the two agents’ predictive distributions can sometimes allow large failures in the theorems. On the other hand, our two hypothetical agents could in-principle resolve such differences via experiment, since they involve different predictions.

## Why Is This Interesting?

This argument was one of our earliest motivators for natural latents. It’s still the main argument we have which singles out natural latents in particular - i.e. the conclusion says that the natural latent conditions are not only sufficient for the property we want, but necessary. Natural latents are the only way to achieve the guarantee we want, that our latent can be expressed in terms of any other latents which explain all interactions between features in the predictive distribution.

[^] Note that, in invoking the Fundamental Theorem, we also implicitly put weight on the assumption that the two agents' latents have nothing to do with each other except via the data. That particular assumption can be circumvented or replaced in multiple ways - e.g. we could instead construct a new latent via resampling, or we could add an assumption that either Λ1 or Λ2 has low entropy given X.

[1] Note that, in invoking the Fundamental Theorem, we also implicitly put weight on the assumption that the two agents' latents have nothing to do with each other except via the data. That particular assumption can be circumvented or replaced in multiple ways - e.g. we could instead construct a new latent via resampling, or we could add an assumption that either Λ1 or Λ2 has low entropy given X.