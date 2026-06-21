const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FETCH_TIMEOUT_MS = 8000;

interface ViaCepData {
  logradouro?: string;
  bairro?: string;
  localidade: string;
  uf: string;
  cep?: string;
}

interface GeoPoint {
  lat: number;
  lng: number;
}

function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    const { storeCep, customerCep } = await req.json();

    if (!storeCep || !customerCep) {
      return new Response(JSON.stringify({ error: 'storeCep and customerCep are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanStoreCep = storeCep.replace(/\D/g, '');
    const cleanCustomerCep = customerCep.replace(/\D/g, '');

    const [storeViaCep, customerViaCep] = await Promise.all([
      fetchViaCep(cleanStoreCep),
      fetchViaCep(cleanCustomerCep),
    ]);

    if (!storeViaCep) {
      return new Response(JSON.stringify({ error: 'CEP da loja inválido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!customerViaCep) {
      return new Response(JSON.stringify({ error: 'CEP não encontrado. Verifique e tente novamente.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [storeGeo, customerGeo] = await Promise.all([
      geocodeGoogle(storeViaCep, cleanStoreCep, GOOGLE_MAPS_API_KEY),
      geocodeGoogle(customerViaCep, cleanCustomerCep, GOOGLE_MAPS_API_KEY),
    ]);

    if (!storeGeo) {
      return new Response(JSON.stringify({ error: 'Erro ao localizar o endereço da loja.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!customerGeo) {
      return new Response(JSON.stringify({ error: 'Endereço do cliente não encontrado. Tente informar o endereço completo.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Store coords:', storeGeo.lng, storeGeo.lat, '| Customer coords:', customerGeo.lng, customerGeo.lat);

    const dmUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${storeGeo.lat},${storeGeo.lng}&destinations=${customerGeo.lat},${customerGeo.lng}&mode=driving&language=pt-BR&region=br&key=${GOOGLE_MAPS_API_KEY}`;

    let dmRes: Response;
    try {
      dmRes = await fetchWithTimeout(dmUrl);
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      throw new Error(isAbort ? 'Timeout ao consultar o Google Maps. Tente novamente.' : 'Erro ao consultar o Google Maps.');
    }

    if (!dmRes.ok) {
      const txt = await dmRes.text();
      console.error(`Google Distance Matrix HTTP error [${dmRes.status}]: ${txt}`);
      throw new Error(`Google Distance Matrix HTTP error [${dmRes.status}]`);
    }

    const dmData = await dmRes.json();
    if (dmData.status !== 'OK') {
      console.error('Google Distance Matrix status:', dmData.status, dmData.error_message);
      throw new Error(`Google Distance Matrix error: ${dmData.status}`);
    }

    const element = dmData.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      console.error('No route element. status:', element?.status);
      throw new Error('Não foi possível traçar uma rota até o endereço.');
    }

    const rawDistanceKm = element.distance.value / 1000;
    const distanceKm = Math.round(rawDistanceKm * 10) / 10;
    const durationMin = Math.round(element.duration.value / 60);

    return new Response(JSON.stringify({
      distanceKm,
      durationMin,
      customerAddress: formatAddress(customerViaCep),
      storeAddress: formatAddress(storeViaCep),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error calculating route:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao calcular o frete.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- Helpers ---

async function fetchViaCep(cep: string): Promise<ViaCepData | null> {
  if (cep.length !== 8) return null;
  try {
    const res = await fetchWithTimeout(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro || undefined,
      bairro: data.bairro || undefined,
      localidade: data.localidade,
      uf: data.uf,
      cep,
    };
  } catch {
    return null;
  }
}

async function geocodeGoogle(addr: ViaCepData, cep: string, apiKey: string): Promise<GeoPoint | null> {
  const parts = [
    addr.logradouro,
    addr.bairro,
    addr.localidade,
    addr.uf,
    cep,
    'Brasil',
  ].filter(Boolean);
  const fullAddress = parts.join(', ');

  // Try 1: full address
  const r1 = await callGoogleGeocode(fullAddress, apiKey);
  if (r1) return r1;

  // Try 2: CEP + country components
  const compUrl = `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${cep}|country:BR&key=${apiKey}`;
  const r2 = await callGoogleGeocodeUrl(compUrl);
  if (r2) return r2;

  // Try 3: logradouro + city + UF (useful for rural CEPs with no logradouro)
  if (addr.logradouro) {
    const r3 = await callGoogleGeocode(`${addr.logradouro}, ${addr.localidade}, ${addr.uf}, Brasil`, apiKey);
    if (r3) return r3;
  }

  // Try 4: city + UF only (last resort — may be imprecise)
  return callGoogleGeocode(`${addr.localidade}, ${addr.uf}, Brasil`, apiKey);
}

async function callGoogleGeocode(query: string, apiKey: string): Promise<GeoPoint | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=br&language=pt-BR&key=${apiKey}`;
  return callGoogleGeocodeUrl(url);
}

async function callGoogleGeocodeUrl(url: string): Promise<GeoPoint | null> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      console.error('Google Geocode HTTP error:', res.status);
      return null;
    }
    const data = await res.json();
    if (data.status !== 'OK') {
      console.warn('Google Geocode status:', data.status, data.error_message);
      return null;
    }
    const loc = data.results?.[0]?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    console.error(isAbort ? 'Geocode timeout' : 'Geocode error:', err);
    return null;
  }
}

function formatAddress(addr: ViaCepData): string {
  const parts = [addr.logradouro, addr.bairro, `${addr.localidade} - ${addr.uf}`].filter(Boolean);
  return parts.join(', ');
}
