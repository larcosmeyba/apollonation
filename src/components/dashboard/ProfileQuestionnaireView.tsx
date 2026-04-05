import { Weight, Ruler, Activity, Target, Calendar, Dumbbell, Apple, ShoppingCart } from "lucide-react";

interface QuestionnaireData {
  age: number;
  sex: string;
  height_inches: number;
  weight_lbs: number;
  goal_weight?: number | null;
  activity_level: string;
  workout_days_per_week: number;
  workout_duration_minutes?: number | null;
  training_methods: string[];
  preferred_training_days?: string[] | null;
  goal_next_4_weeks?: string | null;
  dietary_restrictions?: string[] | null;
  grocery_store?: string | null;
  weekly_food_budget?: number | null;
  has_other_activities?: boolean | null;
  other_activities?: any;
}

const formatHeight = (inches: number) => {
  const ft = Math.floor(inches / 12);
  const rem = inches % 12;
  return `${ft}'${rem}"`;
};

const ProfileQuestionnaireView = ({ questionnaire }: { questionnaire: QuestionnaireData }) => {
  return (
    <div className="space-y-3">
      {/* Physical Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Weight} label="Weight" value={`${questionnaire.weight_lbs} lbs`} />
        <StatCard icon={Ruler} label="Height" value={formatHeight(questionnaire.height_inches)} />
        <StatCard icon={Activity} label="Activity Level" value={questionnaire.activity_level} capitalize />
        <StatCard icon={Target} label="Training" value={`${questionnaire.workout_days_per_week}x/week`} />
      </div>

      {/* Additional Details */}
      <div className="card-apollo p-5 space-y-4">
        <h2 className="font-heading text-base">Profile Details</h2>

        <DetailRow label="Age" value={`${questionnaire.age} years old`} />
        <DetailRow label="Sex" value={questionnaire.sex} capitalize />
        {questionnaire.goal_weight && (
          <DetailRow label="Goal Weight" value={`${questionnaire.goal_weight} lbs`} />
        )}
        {questionnaire.workout_duration_minutes && (
          <DetailRow label="Workout Duration" value={`${questionnaire.workout_duration_minutes} min`} />
        )}
        {questionnaire.training_methods?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Training Methods</p>
            <div className="flex flex-wrap gap-1.5">
              {questionnaire.training_methods.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary capitalize">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
        {questionnaire.preferred_training_days && questionnaire.preferred_training_days.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Preferred Training Days</p>
            <div className="flex flex-wrap gap-1.5">
              {questionnaire.preferred_training_days.map((d) => (
                <span key={d} className="px-2 py-0.5 rounded-full bg-muted border border-border text-xs capitalize">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
        {questionnaire.dietary_restrictions && questionnaire.dietary_restrictions.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Dietary Restrictions</p>
            <div className="flex flex-wrap gap-1.5">
              {questionnaire.dietary_restrictions.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 text-xs">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
        {questionnaire.grocery_store && (
          <DetailRow label="Grocery Store" value={questionnaire.grocery_store} icon={ShoppingCart} />
        )}
        {questionnaire.weekly_food_budget && (
          <DetailRow label="Weekly Food Budget" value={`$${questionnaire.weekly_food_budget}`} />
        )}
      </div>

      {/* 4-Week Goal */}
      {questionnaire.goal_next_4_weeks && (
        <div className="card-apollo p-5">
          <h2 className="font-heading text-base mb-2">Current 4-Week Goal</h2>
          <p className="text-sm text-muted-foreground">{questionnaire.goal_next_4_weeks}</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, capitalize }: { icon: any; label: string; value: string; capitalize?: boolean }) => (
  <div className="card-apollo p-4 flex items-center gap-3">
    <Icon className="w-5 h-5 text-primary flex-shrink-0" />
    <div>
      <p className={`text-sm font-heading ${capitalize ? "capitalize" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  </div>
);

const DetailRow = ({ label, value, capitalize, icon: Icon }: { label: string; value: string; capitalize?: boolean; icon?: any }) => (
  <div className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
    <span className={`text-sm font-medium ${capitalize ? "capitalize" : ""}`}>{value}</span>
  </div>
);

export default ProfileQuestionnaireView;
