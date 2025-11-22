'use client'
import { use, useState } from "react";
import Loader from "./components/Loader";

export default function Home() {
  const [followers, setFollowers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFollowers = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements[0] as HTMLInputElement).value;
    setLoading(true);

    try {
      const response = await fetch("/api/getFollowers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      setFollowers(data.followers);
      setLoading(false);
    } catch (error) {
      console.error("Check your username", error);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl mb-10">X Followers</h1>
      <form className="flex flex-col gap-2" onSubmit={fetchFollowers}>
        <div className="flex">
          <div className="p-2 px-3 bg-gray-200 rounded-s-lg">
            <span className="text-gray-500">@</span>
          </div>
          <input
            className="border-t border-b border-e border-gray-200 rounded-e-lg p-2 focus:outline-none"
            type="text"
            placeholder="username"
          />
        </div>
        <button
          className="bg-white text-black rounded-lg p-2 "
          type="submit"
        > Get Followers</button>
      </form>
      {loading &&
        <div className="mt-4">
          <Loader />
        </div>
      }
      {error && <div className="mt-4 text-red-500">{error}</div>}
      {followers == 0 ? null : (
        <div className="mt-10 text-xl">
          Followers: {followers}
        </div>
      )}
    </div>
  );
}
