import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings as SettingsIcon,
  Key,
  Eye,
  EyeOff,
  Loader,
  CheckCircle,
  XCircle,
} from "lucide-react";
import api from "@/services/api";

const Settings = () => {
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");

  // Profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [isProfileError, setIsProfileError] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Job preferences
  const [rolesOfInterest, setRolesOfInterest] = useState<string[]>([]);
  const [dreamCompanies, setDreamCompanies] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [jobType, setJobType] = useState("");

  useEffect(() => {
    loadApiKey();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get("/users/profile");
      if (response.data.success) {
        const prefs = response.data.data.user.jobPreferences || {};
        setRolesOfInterest(prefs.rolesOfInterest || []);
        setDreamCompanies(prefs.dreamCompanies || []);
        setSkills(prefs.skills || []);
        setCity(prefs.location?.city || "");
        setCountry(prefs.location?.country || "");
        setExperienceLevel(prefs.experienceLevel || "");
        setJobType(prefs.jobType || "");
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  const handleSaveProfile = async () => {
    setIsProfileSaving(true);
    setProfileMessage("");

    try {
      const response = await api.put("/users/job-preferences", {
        jobPreferences: {
          rolesOfInterest,
          dreamCompanies,
          skills,
          location: { city, country },
          experienceLevel,
          jobType,
        },
      });

      if (response.data.success) {
        setProfileMessage("✓ Job preferences saved successfully!");
        setIsProfileError(false);
        setIsEditingProfile(false);
      }
    } catch (error: any) {
      setProfileMessage(
        error.response?.data?.error || "Failed to save preferences"
      );
      setIsProfileError(true);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const loadApiKey = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/users/api-keys/gemini");
      if (response.data.success) {
        setHasExistingKey(response.data.data.hasKey);
        setMaskedKey(response.data.data.maskedKey || "");
      }
    } catch (error) {
      console.error("Failed to load API key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setMessage("Please enter a valid API key");
      setIsError(true);
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await api.put("/users/api-keys/gemini", {
        apiKey: geminiApiKey.trim(),
      });

      if (response.data.success) {
        setMessage("✓ Gemini API key saved successfully!");
        setIsError(false);
        setHasExistingKey(true);
        setGeminiApiKey("");
        setShowApiKey(false);
        await loadApiKey();
      }
    } catch (error: any) {
      setMessage(error.response?.data?.error || "Failed to save API key");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (
      !confirm(
        "Are you sure you want to remove your Gemini API key? The application will fall back to the default API key."
      )
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.delete("/users/api-keys/gemini");
      if (response.data.success) {
        setMessage("✓ API key removed successfully");
        setIsError(false);
        setHasExistingKey(false);
        setMaskedKey("");
        setGeminiApiKey("");
      }
    } catch (error: any) {
      setMessage(error.response?.data?.error || "Failed to remove API key");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your account preferences and application settings.
          </p>
        </div>

        <div className="space-y-6">
          {/* Gemini API Key Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Gemini API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Add your own Gemini API key to avoid
                  rate limits. Your key will be used first, with fallback to the
                  application's key if it fails. Get your free API key from{" "}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    Google AI Studio
                  </a>
                  .
                </AlertDescription>
              </Alert>

              {message && (
                <Alert
                  className={`mb-4 ${
                    isError
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <AlertDescription
                    className={`text-sm ${
                      isError ? "text-red-800" : "text-green-800"
                    }`}
                  >
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {hasExistingKey && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">
                          API Key Configured
                        </span>
                      </div>
                      <p className="text-sm text-green-700 mb-2">
                        Current key: {maskedKey}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveApiKey}
                        disabled={isSaving}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {isSaving ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          "Remove Key"
                        )}
                      </Button>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="gemini-api-key">
                      {hasExistingKey
                        ? "Update API Key"
                        : "Enter Your Gemini API Key"}
                    </Label>
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <Input
                          id="gemini-api-key"
                          type={showApiKey ? "text" : "password"}
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="AIza..."
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        onClick={handleSaveApiKey}
                        disabled={isSaving || !geminiApiKey.trim()}
                      >
                        {isSaving ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Key"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Benefits:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Avoid shared rate limits</li>
                      <li>Higher API quota for your usage</li>
                      <li>Automatic fallback to app's key if yours fails</li>
                      <li>Your key is stored securely and never shared</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Job Preferences</span>
                {!isEditingProfile && (
                  <Button
                    onClick={() => setIsEditingProfile(true)}
                    variant="outline"
                    size="sm"
                  >
                    Edit Profile
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-800">
                  <strong>💼 Job Alerts:</strong> Add your job preferences to
                  receive personalized job recommendations in your dashboard.
                </AlertDescription>
              </Alert>

              {profileMessage && (
                <Alert
                  className={`mb-4 ${
                    isProfileError
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <AlertDescription
                    className={`text-sm ${
                      isProfileError ? "text-red-800" : "text-green-800"
                    }`}
                  >
                    {profileMessage}
                  </AlertDescription>
                </Alert>
              )}

              {isEditingProfile ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="roles">Roles of Interest</Label>
                    <Input
                      id="roles"
                      value={rolesOfInterest.join(", ")}
                      onChange={(e) =>
                        setRolesOfInterest(
                          e.target.value.split(",").map((r) => r.trim())
                        )
                      }
                      placeholder="e.g. Software Engineer, Data Scientist"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separate multiple roles with commas
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="companies">Dream Companies</Label>
                    <Input
                      id="companies"
                      value={dreamCompanies.join(", ")}
                      onChange={(e) =>
                        setDreamCompanies(
                          e.target.value.split(",").map((c) => c.trim())
                        )
                      }
                      placeholder="e.g. Google, Microsoft, Amazon"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separate multiple companies with commas
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="skills-edit">Skills</Label>
                    <Input
                      id="skills-edit"
                      value={skills.join(", ")}
                      onChange={(e) =>
                        setSkills(
                          e.target.value.split(",").map((s) => s.trim())
                        )
                      }
                      placeholder="e.g. React, Python, AWS"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separate multiple skills with commas
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city-edit">City</Label>
                      <Input
                        id="city-edit"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. San Francisco"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country-edit">Country</Label>
                      <Input
                        id="country-edit"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. USA"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="exp-level">Experience Level</Label>
                      <select
                        id="exp-level"
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select level</option>
                        <option value="entry">Entry Level</option>
                        <option value="mid">Mid Level</option>
                        <option value="senior">Senior Level</option>
                        <option value="lead">Lead/Principal</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="job-type-edit">Job Type</Label>
                      <select
                        id="job-type-edit"
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select type</option>
                        <option value="full-time">Full Time</option>
                        <option value="part-time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setIsEditingProfile(false);
                        loadProfile();
                      }}
                      variant="outline"
                      disabled={isProfileSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isProfileSaving}
                    >
                      {isProfileSaving ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Preferences"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {rolesOfInterest.length > 0 && (
                    <div>
                      <span className="font-semibold text-sm">Roles:</span>
                      <p className="text-gray-700">
                        {rolesOfInterest.join(", ")}
                      </p>
                    </div>
                  )}
                  {dreamCompanies.length > 0 && (
                    <div>
                      <span className="font-semibold text-sm">Companies:</span>
                      <p className="text-gray-700">
                        {dreamCompanies.join(", ")}
                      </p>
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div>
                      <span className="font-semibold text-sm">Skills:</span>
                      <p className="text-gray-700">{skills.join(", ")}</p>
                    </div>
                  )}
                  {(city || country) && (
                    <div>
                      <span className="font-semibold text-sm">Location:</span>
                      <p className="text-gray-700">
                        {[city, country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                  {experienceLevel && (
                    <div>
                      <span className="font-semibold text-sm">Experience:</span>
                      <p className="text-gray-700 capitalize">
                        {experienceLevel} Level
                      </p>
                    </div>
                  )}
                  {jobType && (
                    <div>
                      <span className="font-semibold text-sm">Job Type:</span>
                      <p className="text-gray-700 capitalize">
                        {jobType.replace("-", " ")}
                      </p>
                    </div>
                  )}
                  {rolesOfInterest.length === 0 &&
                    dreamCompanies.length === 0 &&
                    skills.length === 0 && (
                      <p className="text-gray-500 italic">
                        No job preferences set. Click "Edit Profile" to add your
                        preferences.
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
