import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getProfileFn, saveInterestsFn, getSessionFn } from "../server/profile";
import { INTEREST_CATEGORIES } from "../lib/interests";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  loader: async () => {
    const [profile, session] = await Promise.all([
      getProfileFn(),
      getSessionFn(),
    ]);
    return { profile, session };
  },
});

function SettingsPage() {
  const { profile, session } = Route.useLoaderData();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Initialize from profile
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile?.interests?.map((i: any) => i.categoryId) || []
  );
  const [selectedSubcategories, setSelectedSubcategories] = useState<
    Record<string, string[]>
  >(
    profile?.interests?.reduce((acc: any, i: any) => {
      acc[i.categoryId] = i.subcategoryIds;
      return acc;
    }, {}) || {}
  );

  if (!session?.user) {
    navigate({ to: "/login" });
    return null;
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSubcategory = (categoryId: string, subcategoryId: string) => {
    setSelectedSubcategories((prev) => {
      const current = prev[categoryId] || [];
      const updated = current.includes(subcategoryId)
        ? current.filter((id) => id !== subcategoryId)
        : [...current, subcategoryId];
      return { ...prev, [categoryId]: updated };
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError("");
    setSuccess(false);

    const interests = selectedCategories.map((catId) => ({
      categoryId: catId,
      subcategoryIds: selectedSubcategories[catId] || [],
    }));

    try {
      await saveInterestsFn({ data: { interests } });
      setSuccess(true);
      setTimeout(() => navigate({ to: "/" }), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = INTEREST_CATEGORIES.filter((cat) =>
    selectedCategories.includes(cat.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-lg">☀️</span>
            </div>
            <span className="font-bold text-xl text-slate-900">Settings</span>
          </div>

          <Button asChild variant="ghost">
            <a href="/">← Back</a>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Categories Section */}
        <Card className="mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle>Your Interests</CardTitle>
            <CardDescription>Select the topics you want in your morning briefs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {INTEREST_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${selectedCategories.includes(category.id)
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <span className="text-2xl block mb-1">{category.emoji}</span>
                  <span className={`font-medium text-sm ${selectedCategories.includes(category.id) ? 'text-indigo-700' : 'text-slate-700'
                    }`}>
                    {category.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Subcategories */}
            {filteredCategories.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-slate-200">
                <h3 className="font-medium text-slate-900">Specific Topics</h3>
                {filteredCategories.map((category) => (
                  <div key={category.id}>
                    <p className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                      <span>{category.emoji}</span>
                      {category.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {category.subcategories.map((sub) => (
                        <Badge
                          key={sub.id}
                          variant={(selectedSubcategories[category.id] || []).includes(sub.id) ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${(selectedSubcategories[category.id] || []).includes(sub.id)
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : "hover:bg-slate-100"
                            }`}
                          onClick={() => toggleSubcategory(category.id, sub.id)}
                        >
                          {sub.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="animate-fade-in">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm text-center">
              ✓ Settings saved! Redirecting...
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isLoading || selectedCategories.length === 0}
            size="lg"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-6 text-lg font-semibold shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </main>
    </div>
  );
}
