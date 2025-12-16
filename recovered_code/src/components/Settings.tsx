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

  useEffect(() => {
    loadApiKey();
  }, []);

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

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl text-white">
                      <SettingsIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-semibold">Profile & Preferences</div>
                      <div className="text-sm text-gray-500">
                        Update your display name, notification preferences and
                        more.
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="default">Edit Profile</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
