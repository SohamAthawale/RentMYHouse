import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { flatsAPI } from "../../api/endpoints";
import { Home, MapPin, DollarSign, User } from "lucide-react";
import Loader from "../../components/Loader";

export default function MyFlat() {
  const { user } = useAuth();

  const [flat, setFlat] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlat();
  }, []);

  // --------------------------------------------------
  // Fetch tenant's flat
  // --------------------------------------------------
  const fetchFlat = async () => {
    try {
      const response = await flatsAPI.listFlats();
      const flats = response.data?.flats || [];

      const formattedFlats = flats.map((f) => ({
        flat_unique_id: f.flat_unique_id,
        flat_name: f.title || "Unnamed Flat",
        location: f.address || "Unknown",
        rent_amount: f.rent ?? null,
        is_rented: Boolean(f.is_rented),
        tenant_unique_id: f.tenant?.unique_id ?? null,
        owner_name: f.owner?.username ?? "N/A",

        // Property features
        bedrooms: f.bedrooms ?? null,
        bathrooms: f.bathrooms ?? null,
        area_sqft: f.area_sqft ?? null,
        furnishing: f.furnishing ?? "Unfurnished",
        property_type: f.property_type ?? "Apartment",
      }));

      const myFlat = formattedFlats.find(
        (f) => f.is_rented && f.tenant_unique_id === user.unique_id
      );

      setFlat(myFlat || null);

      if (myFlat) {
        fetchPrediction(myFlat);
      }
    } catch (err) {
      console.error("Error fetching flat:", err);
      setFlat(null);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Fetch AI rent prediction
  // --------------------------------------------------
 const fetchPrediction = async (flat) => {
  try {
    const payload = {
      address: flat.location,
      bedrooms: Number(flat.bedrooms),
      bathrooms: Number(flat.bathrooms),
      area_sqft: Number(flat.area_sqft),
      furnishing: flat.furnishing,
      property_type: flat.property_type,
    };

    const res = await fetch("http://127.0.0.1:5001/predict-rent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) setPrediction(data);
  } catch (err) {
    console.error(err);
  }
};


  // --------------------------------------------------
  // Deal quality logic
  // --------------------------------------------------
  const getDealQuality = () => {
    if (!prediction || !flat?.rent_amount) return null;

    const actual = Number(flat.rent_amount);
    const predicted = prediction.predicted_rent;

    if (actual <= predicted * 0.9) {
      return { label: "Good Deal", color: "badge-success" };
    }
    if (actual >= predicted * 1.1) {
      return { label: "Overpriced", color: "badge-danger" };
    }
    return { label: "Fair Price", color: "badge-warning" };
  };

  // --------------------------------------------------
  // UI STATES
  // --------------------------------------------------
  if (loading) return <Loader />;

  if (!flat) {
    return (
      <div className="page">
        <h1 className="page-title">My Flat</h1>
        <div className="card p-12 text-center">
          <Home size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            No Flat Assigned
          </h3>
          <p className="text-slate-500">
            You are not currently assigned to any flat
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------
  return (
    <div className="page">
      <h1 className="page-title">My Flat</h1>

      <div className="card p-8">
        <div className="flex items-start gap-6">
          <div className="p-4 rounded-2xl shadow-soft bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
            <Home size={40} />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-2">
              {flat.flat_name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

              {/* Location */}
              <InfoItem
                icon={<MapPin size={20} className="text-slate-400" />}
                label="Location"
                value={flat.location}
              />

              {/* Rent */}
              <InfoItem
                icon={<DollarSign size={20} className="text-slate-400" />}
                label="Monthly Rent"
                value={
                  flat.rent_amount
                    ? `₹${Number(flat.rent_amount).toLocaleString("en-IN")}`
                    : "Not available"
                }
              />

              {/* Property details */}
              <InfoItem
                icon={<Home size={20} className="text-slate-400" />}
                label="Property Details"
                value={`${flat.bedrooms ?? "–"} Bed · ${
                  flat.bathrooms ?? "–"
                } Bath · ${flat.area_sqft ?? "–"} sqft`}
              />

              {/* Type */}
              <InfoItem
                icon={<Home size={20} className="text-slate-400" />}
                label="Type"
                value={`${flat.property_type} (${flat.furnishing})`}
              />

              {/* Owner */}
              <InfoItem
                icon={<User size={20} className="text-slate-400" />}
                label="Owner"
                value={flat.owner_name}
              />

              {/* Status */}
              <div className="flex items-center gap-3">
                <Home size={20} className="text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <span className="badge-success">
                    Rented
                  </span>
                </div>
              </div>

              {/* AI Prediction */}
              {prediction && (
                <div className="flex items-center gap-3">
                  <DollarSign size={20} className="text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">AI Price Check</p>
                    <p className="text-slate-800 font-medium">
                      Estimated: ₹
                      {prediction.predicted_rent.toLocaleString("en-IN")}
                    </p>
                    <span
                      className={`${getDealQuality()?.color} mt-1`}
                    >
                      {getDealQuality()?.label}
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Small reusable UI component
// --------------------------------------------------
function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-slate-800 font-medium">{value}</p>
      </div>
    </div>
  );
}
