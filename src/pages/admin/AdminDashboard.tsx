import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Utensils, Activity, Users } from "lucide-react";
import AdminWorkouts from "@/components/admin/AdminWorkouts";
import AdminRecipes from "@/components/admin/AdminRecipes";
import AdminExercises from "@/components/admin/AdminExercises";
import AdminUsers from "@/components/admin/AdminUsers";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("workouts");

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            Admin <span className="text-apollo-gold">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Manage workouts, recipes, exercises, and user access
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="workouts" className="gap-2">
              <Dumbbell className="w-4 h-4" />
              <span className="hidden sm:inline">Workouts</span>
            </TabsTrigger>
            <TabsTrigger value="recipes" className="gap-2">
              <Utensils className="w-4 h-4" />
              <span className="hidden sm:inline">Recipes</span>
            </TabsTrigger>
            <TabsTrigger value="exercises" className="gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Exercise Library</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts">
            <AdminWorkouts />
          </TabsContent>

          <TabsContent value="recipes">
            <AdminRecipes />
          </TabsContent>

          <TabsContent value="exercises">
            <AdminExercises />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
