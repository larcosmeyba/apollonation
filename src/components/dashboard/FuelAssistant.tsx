import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type AssistantMode =
  | "meal_idea" | "food_swap" | "grocery_help"
  | "macro_explanation" | "what_to_eat_next" | "meal_prep";

interface Recommendation {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  notes: string;
}
interface FuelResponse {
  title: string;
  summary: string;
  recommendations: Recommendation[];
  disclaimer: string;
}

const PROMPT_CHIPS: { label: string; mode: AssistantMode; prompt: string }[] = [
  { label: "What should I eat next?", mode: "what_to_eat_next", prompt: "What should I eat next based on my remaining macros today?" },
  { label: "High-protein meal", mode: "meal_idea", prompt: "Give me a high-protein meal idea that fits my targets." },
  { label: "Swap this food", mode: "food_swap", prompt: "I want to swap white rice — what works for my macros?" },
  { label: "Build a grocery list", mode: "grocery_help", prompt: "Build a short grocery list to help me hit my weekly goals." },
  { label: "Explain my macros", mode: "macro_explanation", prompt: "Explain what my calorie and macro targets mean." },
  { label: "Meal prep ideas", mode: "meal_prep", prompt: "Give me a few prep-friendly meal ideas for the week." },
];

export function FuelAssistant() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AssistantMode>("meal_idea");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FuelResponse | null>(null);

  const ask = async (text: string, m: AssistantMode) => {
    if (!text.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke("openai-fuel-assistant", {
        body: { user_message: text, assistant_mode: m },
      });
      if (error) throw new Error((error as any).message || "Request failed");
      if ((data as any)?.error) {
        toast({
          title: "Fuel Assistant",
          description: (data as any).message ?? "Something went wrong.",
          variant: "destructive",
        });
        return;
      }
      setResponse((data as any).response as FuelResponse);
    } catch (e: any) {
      toast({
        title: "Apollo Fuel Assistant",
        description: "Temporarily unavailable. Your macros and meal plan are still available.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 bg-card border-border space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Apollo Fuel Assistant</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Personalized meal ideas, swaps, and macro guidance built on your profile.
      </p>

      <div className="flex flex-wrap gap-2">
        {PROMPT_CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            disabled={loading}
            onClick={() => { setMode(c.mode); setInput(c.prompt); ask(c.prompt, c.mode); }}
            className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 border border-border transition disabled:opacity-50"
          >
            {c.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input, mode); }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Apollo Fuel…"
          disabled={loading}
          maxLength={500}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
        </Button>
      </form>

      {response && (
        <div className="space-y-3 pt-2">
          <div>
            <h3 className="font-semibold">{response.title}</h3>
            <p className="text-sm text-muted-foreground">{response.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {response.recommendations.map((r, i) => (
              <Card key={i} className="p-4 bg-background/40 border-border">
                <h4 className="font-semibold mb-1">{r.name}</h4>
                <div className="text-xs text-muted-foreground mb-2">
                  {Math.round(r.calories)} kcal · P {Math.round(r.protein)}g · C {Math.round(r.carbs)}g · F {Math.round(r.fat)}g
                </div>
                {r.ingredients?.length > 0 && (
                  <p className="text-xs mb-2">
                    <span className="text-muted-foreground">Ingredients: </span>
                    {r.ingredients.join(", ")}
                  </p>
                )}
                {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground italic">{response.disclaimer}</p>
        </div>
      )}
    </Card>
  );
}
