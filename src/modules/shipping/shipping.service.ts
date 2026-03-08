import { env } from "../../config/env.js";
import { getSettings } from "../settings/settings.service.js";
import { Product } from "../product/product.model.js";

const SHIPPO_BASE = "https://api.goshippo.com";

const shippoHeaders = () => ({
  Authorization: `ShippoToken ${env.SHIPPO_API_KEY}`,
  "Content-Type": "application/json",
});

// ─── Get live carrier rates for a customer address + cart ───────────────────

export async function getShippingRates(
  toAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    name: string;
  },
  items: { productId: string; variantId: string; quantity: number }[],
) {
  const settings = await getSettings();

  // Build combined parcel from all items in cart
  let totalWeightOz = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let totalHeight = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    const variant = product.variants.find((v) => v._id?.toString() === item.variantId);
    if (!variant) continue;

    totalWeightOz += variant.weight * item.quantity;
    maxLength = Math.max(maxLength, variant.length);
    maxWidth = Math.max(maxWidth, variant.width);
    totalHeight += variant.height * item.quantity;
  }

  // Minimum parcel size guard
  const parcel = {
    length: String(Math.max(maxLength, 1)),
    width: String(Math.max(maxWidth, 1)),
    height: String(Math.max(totalHeight, 1)),
    distance_unit: "in",
    weight: String(Math.max(totalWeightOz / 16, 0.1)), // convert oz to lbs
    mass_unit: "lb",
  };

  const shipment = {
    address_from: {
      name: settings.shipFrom.name,
      company: settings.shipFrom.company,
      street1: settings.shipFrom.street1,
      city: settings.shipFrom.city,
      state: settings.shipFrom.state,
      zip: settings.shipFrom.zip,
      country: settings.shipFrom.country,
      phone: settings.shipFrom.phone,
      email: settings.shipFrom.email,
    },
    address_to: {
      name: toAddress.name,
      street1: toAddress.street,
      city: toAddress.city,
      state: toAddress.state,
      zip: toAddress.zip,
      country: "US",
    },
    parcels: [parcel],
    async: false,
  };

  const response = await fetch(`${SHIPPO_BASE}/shipments/`, {
    method: "POST",
    headers: shippoHeaders(),
    body: JSON.stringify(shipment),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Shippo shipment creation failed: ${err}`);
  }

  const data: any = await response.json();

  if (data.status === "ERROR") {
    throw new Error(`Shippo error: ${data.messages?.map((m: any) => m.text).join(", ")}`);
  }

  // Return only active, non-expired rates with all info frontend needs
  const rates = (data.rates || [])
    .filter((r: any) => r.object_state === "VALID")
    .map((r: any) => ({
      rateId: r.object_id,
      carrier: r.provider,
      service: r.servicelevel?.name,
      amount: parseFloat(r.amount),
      currency: r.currency,
      estimatedDays: r.estimated_days,
      durationTerms: r.duration_terms,
    }))
    .sort((a: any, b: any) => a.amount - b.amount); // cheapest first

  return rates;
}

// ─── Verify a rate ID and return its price ───────────────────────────────────
// Used to validate the shippingCost sent from the frontend hasn't been tampered with

export async function verifyShippoRate(rateId: string): Promise<{ amount: number; carrier: string; service: string }> {
  const response = await fetch(`${SHIPPO_BASE}/rates/${rateId}`, {
    headers: shippoHeaders(),
  });

  if (!response.ok) {
    throw new Error("Shipping rate not found or has expired. Please refresh and try again.");
  }

  const data: any = await response.json();

  return {
    amount: parseFloat(data.amount),
    carrier: data.provider,
    service: data.servicelevel?.name,
  };
}

// ─── Purchase label after payment confirmed ──────────────────────────────────

export async function purchaseShippingLabel(rateId: string) {
  const response = await fetch(`${SHIPPO_BASE}/transactions/`, {
    method: "POST",
    headers: shippoHeaders(),
    body: JSON.stringify({
      rate: rateId,
      label_file_type: "PDF",
      async: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Shippo label purchase failed: ${err}`);
  }

  const data: any = await response.json();

  if (data.status !== "SUCCESS") {
    const messages = data.messages?.map((m: any) => m.text).join(", ") || "Unknown error";
    throw new Error(`Shippo transaction failed: ${messages}`);
  }

  return {
    trackingNumber: data.tracking_number as string,
    trackingUrl: data.tracking_url_provider as string,
    labelUrl: data.label_url as string,
    carrier: data.rate?.provider as string,
  };
}
