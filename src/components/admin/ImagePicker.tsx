import { useState } from "react";
import { presetImages } from "@/data/preset-images";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image as ImageIcon } from "lucide-react";

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const categories = [...new Set(presetImages.map((i) => i.category))];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadPreview(result);
      onChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      {value && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}

      <Tabs defaultValue="preset" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="preset"><ImageIcon className="h-3 w-3 mr-1" /> Pré-definidas</TabsTrigger>
          <TabsTrigger value="upload"><Upload className="h-3 w-3 mr-1" /> Upload</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="space-y-2">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-medium text-muted-foreground capitalize mb-1">{cat}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {presetImages
                  .filter((i) => i.category === cat)
                  .map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => onChange(img.url)}
                      className={`relative h-16 rounded-md overflow-hidden border-2 transition-all ${
                        value === img.url ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background text-[9px] px-1 truncate">
                        {img.label}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="upload" className="space-y-2">
          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Clique para enviar uma foto</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          {uploadPreview && (
            <p className="text-xs text-accent">✓ Imagem carregada com sucesso</p>
          )}
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://exemplo.com/foto.jpg"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="text-xs"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => { if (customUrl) onChange(customUrl); }}
              disabled={!customUrl}
            >
              Usar
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
