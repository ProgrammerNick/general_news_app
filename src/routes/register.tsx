import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { signUp } from "../lib/auth-client";
import { INTEREST_CATEGORIES } from "../lib/interests";
import { getProfileFn, getSessionFn, saveInterestsFn } from "../server/profile";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  loader: async () => {
    const [session, profile] = await Promise.all([
      getSessionFn(),
      getProfileFn().catch(() => null),
    ]);
    return { session, profile };
  },
});

type Step = "account" | "categories" | "subcategories";

function RegisterPage() {
  const navigate = useNavigate();
  const { session, profile } = Route.useLoaderData();
  const hasSession = !!session?.user;
  const needsOnboarding = hasSession && (!profile || !profile.onboardingComplete);
  const alreadyOnboarded = hasSession && profile?.onboardingComplete;
  const initialStep: Step = needsOnboarding ? "categories" : "account";
  const [step, setStep] = useState<Step>(initialStep);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Interest selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    if (alreadyOnboarded) {
      navigate({ to: "/" });
    }
  }, [alreadyOnboarded, navigate]);

  if (alreadyOnboarded) {
    return null;
  }

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { error } = await signUp.email({
        email,
        password,
        name,
      });

      if (error) {
        setError(error.message || "Sign up failed");
        setIsLoading(false);
        return;
      }

      setStep("categories");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleCategoriesNext = () => {
    if (selectedCategories.length === 0) {
      setError("Please select at least one category");
      return;
    }
    setError("");
    setStep("subcategories");
  };

  const handleComplete = async () => {
    setIsLoading(true);

    const interests = selectedCategories.map((catId) => ({
      categoryId: catId,
      subcategoryIds: selectedSubcategories[catId] || [],
    }));

    try {
      await saveInterestsFn({ data: { interests } });
      navigate({ to: "/" });
    } catch (err) {
      setError("Failed to save interests");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = INTEREST_CATEGORIES.filter((cat) =>
    selectedCategories.includes(cat.id)
  );

  const steps = ["account", "categories", "subcategories"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex justify-center gap-3 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${i <= currentStepIndex
                  ? "bg-white text-indigo-900"
                  : "bg-white/20 text-white/60"
                  }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${i < currentStepIndex ? "bg-white" : "bg-white/20"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step: Create Account */}
        {step === "account" && (
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <span className="text-3xl">👤</span>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                Create your account
              </CardTitle>
              <CardDescription className="text-indigo-200">
                Join thousands getting personalized news briefs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAccountSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-indigo-200">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-indigo-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-indigo-200">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white text-indigo-900 hover:bg-indigo-100"
                  size="lg"
                >
                  {isLoading ? "Creating account..." : "Continue"}
                </Button>
              </form>

              <p className="text-center text-sm text-indigo-300 mt-6">
                Already have an account?{" "}
                <a href="/login" className="text-white hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: Select Categories */}
        {step === "categories" && (
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                What interests you?
              </CardTitle>
              <CardDescription className="text-indigo-200">
                Select the topics you want in your briefs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {INTEREST_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${selectedCategories.includes(category.id)
                      ? "bg-white border-white text-slate-900"
                      : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                      }`}
                  >
                    <span className="text-3xl block mb-2">{category.emoji}</span>
                    <h3 className="font-semibold">{category.label}</h3>
                    <p className={`text-xs mt-1 ${selectedCategories.includes(category.id) ? 'text-slate-500' : 'text-white/60'}`}>
                      {category.description}
                    </p>
                  </button>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm text-center mb-4">
                  {error}
                </div>
              )}

              <Button
                type="button"
                onClick={handleCategoriesNext}
                className="w-full bg-white text-indigo-900 hover:bg-indigo-100"
                size="lg"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Select Subcategories */}
        {step === "subcategories" && (
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-fade-in max-h-[80vh] overflow-y-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <CardTitle className="text-3xl font-bold text-white">
                Get more specific
              </CardTitle>
              <CardDescription className="text-indigo-200">
                Choose specific topics you're passionate about
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mb-8">
                {filteredCategories.map((category) => (
                  <div key={category.id}>
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <span>{category.emoji}</span>
                      {category.label}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {category.subcategories.map((sub) => (
                        <Badge
                          key={sub.id}
                          variant={(selectedSubcategories[category.id] || []).includes(sub.id) ? "default" : "outline"}
                          className={`cursor-pointer px-4 py-2 text-sm transition-all ${(selectedSubcategories[category.id] || []).includes(sub.id)
                            ? "bg-white text-indigo-900 hover:bg-indigo-100"
                            : "bg-transparent text-white border-white/30 hover:bg-white/10"
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

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("categories")}
                  className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="flex-1 bg-white text-indigo-900 hover:bg-indigo-100"
                  size="lg"
                >
                  {isLoading ? "Saving..." : "Complete Setup 🚀"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
