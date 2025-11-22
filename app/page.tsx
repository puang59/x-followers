"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import Loader from "./components/Loader";
import DotCanvas from "./components/DotCanvas";
import html2canvas from "html2canvas";

export default function Home() {
  const [followers, setFollowers] = useState(0);
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const fetchFollowers = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const usernameValue = (form.elements[0] as HTMLInputElement).value;
    setUsername(usernameValue);
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/getFollowers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: usernameValue }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setFollowers(data.followers);
      setProfileImage(data.profileImage);
      setLoading(false);
    } catch (error) {
      console.error("Check your username", error);
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!captureRef.current) return;

    setCopying(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#000000",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            setCopying(false);
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 3000);
          } catch (err) {
            console.error("Failed to copy:", err);
            alert("Failed to copy to clipboard. Please try again.");
            setCopying(false);
          }
        }
      });
    } catch (error) {
      console.error("Error capturing image:", error);
      alert("Failed to capture image. Please try again.");
      setCopying(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <h1 className="text-2xl sm:text-3xl mb-6 sm:mb-10 font-bold">
        X Followers
      </h1>
      <form
        className="flex flex-col gap-2 w-full max-w-sm"
        onSubmit={fetchFollowers}
      >
        <div className="flex">
          <div className="p-2 px-3 bg-gray-200 rounded-s-lg">
            <span className="text-gray-500">@</span>
          </div>
          <input
            className="border-t border-b border-e border-gray-200 rounded-e-lg p-2 focus:outline-none flex-1"
            type="text"
            placeholder="username"
            required
          />
        </div>
        <button
          className={`rounded-lg p-2 transition-colors ${
            loading
              ? "bg-zinc-400 text-gray-600 cursor-not-allowed"
              : "bg-white text-black hover:bg-gray-100"
          }`}
          type="submit"
          disabled={loading}
        >
          {" "}
          render{" "}
        </button>
      </form>

      {loading && (
        <div className="mt-4">
          <Loader />
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-500 text-center px-4">{error}</div>
      )}

      {profileImage != null && followers != 0 && (
        <>
          <div ref={captureRef} className="w-full max-w-2xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-5 mt-5 sm:mt-16 mb-5 px-5">
              <div className="shrink-0">
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full"
                  unoptimized
                />
              </div>
              <div className="flex flex-col text-center sm:text-left">
                <span className="text-lg sm:text-xl font-bold">
                  @{username}
                </span>
                <span className="text-sm sm:text-md">
                  {followers.toLocaleString()} followers
                </span>
              </div>
            </div>
            <DotCanvas followers={followers} />
          </div>

          <button
            onClick={copyToClipboard}
            disabled={copying || copied}
            className={`mt-6 text-white rounded-lg px-6 py-3 transition-colors disabled:cursor-not-allowed font-medium ${
              copying
                ? "bg-gray-600"
                : copied
                ? "bg-green-600 hover:bg-green-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {copied ? "Copied ✓" : copying ? "Copying..." : "Copy to Clipboard"}
          </button>
        </>
      )}

      {followers != 0 && profileImage == null && (
        <DotCanvas followers={followers} />
      )}
    </div>
  );
}
