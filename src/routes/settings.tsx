import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getProfileFn, saveInterestsFn, getSessionFn } from "../server/profile";
import { INTEREST_CATEGORIES } from "../lib/interests";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Check } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-serif text-xl font-bold">
              M
            </div>
            <span className="font-serif font-bold text-xl text-slate-900 tracking-tight">Topics & Interests</span>
          </div>

          <Button asChild variant="ghost" className="gap-2">
            <a href="/">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </a>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Curate Your Intelligence</h1>
          <p className="text-slate-500 text-lg">Select the topics that matter most to your daily briefing.</p>
        </div>

        {/* Categories Section */}
        <Card className="mb-8 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif">Broad Interests</CardTitle>
            <CardDescription>Select high-level categories to enable detailed curation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {INTEREST_CATEGORIES.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-md"
                      : "border-slate-100 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    <span className="text-2xl block mb-2">{category.emoji}</span>
                    <span className={`font-semibold text-sm block ${isSelected ? "text-white" : "text-slate-700"}`}>
                      {category.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subcategories */}
        {filteredCategories.length > 0 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {filteredCategories.map((category) => (
              <Card key={category.id} className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.emoji}</span>
                    <CardTitle className="font-serif text-xl">{category.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-3">
                    {category.subcategories.map((sub) => {
                      const isSelected = (selectedSubcategories[category.id] || []).includes(sub.id);
                      return (
                        <Badge
                          key={sub.id}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${isSelected
                            ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                            : "hover:bg-slate-100 border-slate-200 text-slate-600"
                            }`}
                          onClick={() => toggleSubcategory(category.id, sub.id)}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 mr-1.5 inline-block" />}
                          {sub.label}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 sticky bottom-6 z-40 bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
              {success && <p className="text-green-600 text-sm font-medium">Settings saved successfully!</p>}
            </div>
            <Button
              onClick={handleSave}
              disabled={isLoading || selectedCategories.length === 0}
              size="lg"
              className="px-8 font-semibold"
            >
              {isLoading ? "Saving..." : "Save Topics"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
