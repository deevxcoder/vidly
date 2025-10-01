import { useState } from "react";
import UploadZone, { UploadFile } from "../UploadZone";

export default function UploadZoneExample() {
  const [files] = useState<UploadFile[]>([
    {
      id: "1",
      name: "tutorial-video-part-1.mp4",
      size: "245 MB",
      progress: 65,
      status: "uploading",
    },
    {
      id: "2",
      name: "product-demo.mov",
      size: "180 MB",
      progress: 100,
      status: "complete",
    },
  ]);

  return (
    <div className="p-6 max-w-3xl">
      <UploadZone
        files={files}
        onFilesSelected={(files) => console.log("Files selected:", files)}
        onCancel={(id) => console.log("Cancel upload:", id)}
      />
    </div>
  );
}
