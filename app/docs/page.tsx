import type { Metadata } from "next";
import SwaggerUI from "./swagger-ui";

export const metadata: Metadata = {
  title: "Income Tracker - API Documentation",
  description: "Interactive API documentation for the Income Tracker REST API",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI />
    </div>
  );
}
