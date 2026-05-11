"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { Alert } from "@/components/ui";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "",
    description: "Get started with basic features",
    features: [
      "Browse listings",
      "Send interest",
      "Basic chat",
      "Share contact info",
    ],
    missing: [
      "See full review details",
    ],
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: 99,
    period: "/mo",
    description: "Unlock reviews and better matches",
    features: [
      "Everything in Free",
      "See full review details",
      "Read all review comments",
    ],
    missing: [],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 249,
    period: "/mo",
    description: "All features + premium perks",
    features: [
      "Everything in Basic",
      "Highlighted profile badge",
      "Boost listings to the top",
    ],
    missing: [],
    popular: false,
  },
] as const;

export default function PlansPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, hydrated } = useAuth();
  const [error, setError] = useState("");

  const { data } = useQuery({
    queryKey: ["plan"],
    queryFn: api.getPlan,
    staleTime: Infinity,
    enabled: hydrated && isAuthenticated,
  });

  const currentPlan = data?.plan || "free";

  const mutation = useMutation({
    mutationFn: (plan: string) => api.updatePlan(plan),
    onSuccess: (res) => {
      queryClient.setQueryData(["plan"], res);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to update plan"),
  });

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Choose your plan</h1>
          <p className="text-sm text-muted mt-2">Unlock premium features to find your perfect roommate faster</p>
        </div>

        {error && <Alert className="mb-6">{error}</Alert>}

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isDowngrade = PLANS.findIndex((p) => p.id === currentPlan) > PLANS.findIndex((p) => p.id === plan.id);

            return (
              <div
                key={plan.id}
                className={`card p-5 relative flex flex-col ${
                  plan.popular ? "border-accent ring-1 ring-accent/20" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-white text-[11px] font-semibold rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-dim mt-1">{plan.description}</p>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price === 0 ? "Free" : `₹${plan.price}`}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-dim">{plan.period}</span>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 mb-5">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success-text shrink-0 mt-0.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <span className="text-sm text-secondary">{feature}</span>
                    </div>
                  ))}
                  {plan.missing.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faint shrink-0 mt-0.5">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-faint">{feature}</span>
                    </div>
                  ))}
                </div>

                {!hydrated ? (
                  <div className="w-full py-2.5 rounded-xl bg-surface-alt h-10" />
                ) : !isAuthenticated ? (
                  <Link
                    href="/login"
                    className="btn-primary w-full py-2.5 rounded-xl text-sm font-medium text-center"
                  >
                    {plan.price === 0 ? "Sign in to start" : "Sign in to subscribe"}
                  </Link>
                ) : isCurrent ? (
                  <div className="w-full py-2.5 text-center rounded-xl text-sm font-medium bg-success-surface text-success-text border border-success-border">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setError("");
                      mutation.mutate(plan.id);
                    }}
                    disabled={mutation.isPending}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isDowngrade
                        ? "bg-surface-alt text-muted hover:bg-border"
                        : "btn-primary"
                    }`}
                  >
                    {mutation.isPending
                      ? "Updating..."
                      : isDowngrade
                        ? "Downgrade"
                        : plan.price === 0
                          ? "Get Started"
                          : "Upgrade"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-faint mt-6">
          Plans can be changed anytime. No commitments.
        </p>
      </div>
    </div>
  );
}
