import { Product } from "@/data/products";

function PriceTag({ price }: { price: number }) {
  const [whole, cents] = price.toFixed(2).split(".");
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="text-[10px] font-bold text-[#cc0000]">R$</span>
      <span className="text-2xl font-extrabold text-[#cc0000] leading-none">{whole}</span>
      <span className="text-sm font-bold text-[#cc0000]">,{cents}</span>
    </div>
  );
}

interface FlyerProductCardProps {
  product: Product;
  quantity?: number;
  onClick?: (product: Product) => void;
}

function FlyerProductCard({ product, quantity = 0, onClick }: FlyerProductCardProps) {
  const displayPrice = product.promoPrice ?? product.price;
  const selected = quantity > 0;
  const interactive = !!onClick;

  const baseClass =
    "bg-[#ffd700] rounded-lg p-1.5 sm:p-2 flex flex-col items-center relative transition-all";
  const interactiveClass = interactive
    ? "cursor-pointer hover:scale-[1.04] hover:shadow-[0_0_22px_-6px_#ffd700] active:scale-95"
    : "";
  const selectedClass = selected
    ? "ring-2 ring-[#cc0000] shadow-[0_0_18px_-4px_#cc0000]"
    : "";

  const content = (
    <>
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#cc0000] text-white text-[10px] font-extrabold shadow ring-1 ring-white">
          {quantity}
        </span>
      )}
      <div className="w-full aspect-square bg-white rounded-md overflow-hidden mb-1">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-[9px] sm:text-[10px] font-bold text-gray-900 leading-tight text-center line-clamp-2 min-h-[20px] sm:min-h-[24px]">
        {product.name}
        {product.unit ? ` ${product.unit}` : ""}
      </p>
      <PriceTag price={displayPrice} />
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={() => onClick!(product)}
        className={`${baseClass} ${interactiveClass} ${selectedClass} text-left`}
      >
        {content}
      </button>
    );
  }
  return <div className={`${baseClass} ${selectedClass}`}>{content}</div>;
}

interface FlyerPageProps {
  title: string;
  subtitle?: string;
  validDate?: string | null;
  minDeliveryValue?: number | null;
  products: Product[];
  storeName?: string;
  onProductClick?: (product: Product) => void;
  getQuantity?: (productId: string) => number;
}

export function FlyerPage({
  title,
  subtitle,
  validDate,
  minDeliveryValue,
  products,
  storeName = "Escola Raul Pompéia",
  onProductClick,
  getQuantity,
}: FlyerPageProps) {
  const formattedDate = validDate
    ? new Date(validDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;

  return (
    <div className="bg-[#1a3a6e] rounded-xl overflow-hidden shadow-lg w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 pb-1 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-lg font-extrabold text-[#ffd700] leading-tight drop-shadow truncate">{title}</h3>
          {subtitle && <p className="text-[10px] sm:text-xs text-white/80 truncate">{subtitle}</p>}
          {minDeliveryValue != null && (
            <div className="mt-1 bg-[#cc0000] text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
              ENTREGAS A PARTIR DE R${minDeliveryValue.toFixed(2).replace(".", ",")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <img src="/logo-escola.png" alt={storeName} className="h-10 sm:h-12 w-auto object-contain bg-white rounded p-0.5" />
        </div>
      </div>

      {/* Valid date */}
      {formattedDate && (
        <div className="text-center px-2.5 sm:px-3 pb-1">
          <p className="text-[9px] sm:text-[10px] text-[#ffd700] font-bold">
            OFERTAS VÁLIDAS SOMENTE NO DIA {formattedDate} OU ENQUANTO DURAREM OS ESTOQUES
          </p>
        </div>
      )}

      {/* Products grid */}
      <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5 sm:gap-2 p-2 sm:p-3 pt-2">
        {products.slice(0, 6).map((product) => (
          <FlyerProductCard
            key={product.id}
            product={product}
            onClick={onProductClick}
            quantity={getQuantity ? getQuantity(product.id) : 0}
          />
        ))}
      </div>
    </div>
  );
}
