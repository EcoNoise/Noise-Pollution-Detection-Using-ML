import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseConfig";
import { logger } from "../config/appConfig";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Memproses autentikasi...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          logger.error("Auth callback error:", error);
          setStatus("error");
          setMessage("Gagal memproses autentikasi. Silakan coba lagi.");

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login");
          }, 3000);
          return;
        }

        if (data.session && data.session.user) {
          logger.info("Auth callback successful:", data.session.user.email);
          setStatus("success");
          setMessage("Autentikasi berhasil! Mengalihkan ke halaman utama...");

          // Store user info for compatibility
          localStorage.setItem("userId", data.session.user.id);
          localStorage.setItem("userEmail", data.session.user.email || "");

          // Redirect to home after 2 seconds
          setTimeout(() => {
            navigate("/home");
          }, 2000);
        } else {
          logger.warn("No session found in auth callback");
          setStatus("error");
          setMessage(
            "Tidak ada sesi yang ditemukan. Mengalihkan ke halaman login..."
          );

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        }
      } catch (error) {
        logger.error("Unexpected error in auth callback:", error);
        setStatus("error");
        setMessage(
          "Terjadi kesalahan yang tidak terduga. Mengalihkan ke halaman login..."
        );

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case "error":
        return <XCircle className="w-12 h-12 text-red-500" />;
      default:
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "loading":
        return "text-blue-400";
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
      <div className="bg-slate-700 rounded-2xl shadow-xl p-8 border border-slate-600 max-w-md w-full text-center">
        {/* Status Icon */}
        <div className="flex justify-center mb-6">{getStatusIcon()}</div>

        {/* Status Message */}
        <h2 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {status === "loading" && "Memproses Autentikasi"}
          {status === "success" && "Autentikasi Berhasil!"}
          {status === "error" && "Autentikasi Gagal"}
        </h2>

        <p className="text-slate-300 mb-6">{message}</p>

        {/* Loading indicator for loading state */}
        {status === "loading" && (
          <div className="flex justify-center">
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        )}

        {/* Manual navigation buttons for error state */}
        {status === "error" && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={() => navigate("/login")}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kembali ke Login
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-2 px-4 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
            >
              Halaman Utama
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
