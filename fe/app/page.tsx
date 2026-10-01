import {client} from "@/lib/sanity/client";
import {sanityDataset, sanityProjectId} from "@/lib/sanity/env";

export default async function Home() {
  let connected = false;
  let error = "";

  try {
    await client.fetch("true");
    connected = true;
  } catch (err) {
    error = err instanceof Error ? err.message : "Sanity 연결에 실패했습니다.";
  }

  return (
    <main style={{padding: "48px 40px", lineHeight: 1.5}}>
      <p style={{letterSpacing: "0.02em", fontWeight: 200}}>고은사진미술관</p>
      <p style={{marginTop: 24, opacity: 0.8}}>
        project {sanityProjectId} · dataset {sanityDataset}
      </p>
      <p style={{marginTop: 12}}>
        {connected ? "Sanity에 연결됐습니다." : `연결 실패: ${error}`}
      </p>
    </main>
  );
}
