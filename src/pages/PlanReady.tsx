import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dumbbell, Utensils, Shield, ArrowRight } from "lucide-react";
import apolloLogo from "@/assets/apollo-logo.png";

const PlanReady = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: plan } = useQuery({
    queryKey: ["plan-ready-training", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("client_training_plans")
        .select("title")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: nutrition } = useQuery({
    queryKey: ["plan-ready-nutrition", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("nutrition_plans")
        .select("title")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const items = [
    {
      icon: Dumbbell,
      label: "Training Program",
      value: plan?.title || "Generating your plan...",
    },
    {
      icon: Utensils,
      label: "Nutrition Protocol",
      value: nutrition?.title || "Apollo Fuel System",
    },
    {
      icon: Shield,
      label: "Recovery Strategy",
      value: "Mobility & performance recovery protocol",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation" className="w-10 h-10 invert" />
            <span className="font-heading text-lg tracking-wider">
              APOLLO <span className="text-primary">NATION</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-8">
            <Shield className="w-8 h-8 text-primary" />
          </div>

          <h1 className="font-heading text-3xl md:text-4xl tracking-[0.05em] mb-3">
            Your Apollo Plan
            <span className="text-primary block mt-1">Is Ready</span>
          </h1>
          <p className="text-muted-foreground text-sm font-light max-w-sm mx-auto mb-10">
            Based on your goals, training experience, and equipment access, your personalized Apollo training system has been created.
          </p>

          <div className="space-y-3 mb-10">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="apollo"
            size="xl"
            className="w-full rounded-full"
            onClick={() => navigate("/dashboard")}
          >
            Begin Training <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanReady;
