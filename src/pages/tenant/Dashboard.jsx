import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  serviceRequestsAPI,
  financialsAPI,
  flatsAPI,
  rentPredictorAPI
} from '../../api/endpoints';
import { Wrench, DollarSign, CheckCircle, Home, TrendingUp } from 'lucide-react';
import Loader from '../../components/Loader';

export default function TenantDashboard() {
  const { user } = useAuth();

  // ----------------------------
  // Dashboard Stats
  // ----------------------------
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    totalPayments: 0,
  });

  // ----------------------------
  // Flats + ML
  // ----------------------------
  const [flats, setFlats] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);

  // ----------------------------
  // Ideal Flat Predictor
  // ----------------------------
  const [idealForm, setIdealForm] = useState({
    bedrooms: 2,
    bathrooms: 2,
    area_sqft: 750,
    furnishing: 'Semi-Furnished',
    property_type: 'Apartment',
    locality: 'Andheri'
  });
  const [idealPrediction, setIdealPrediction] = useState(null);

  // =================================================
  // INITIAL LOAD
  // =================================================
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchFlatsWithPredictions()
      ]);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // =================================================
  // STATS
  // =================================================
  const fetchStats = async () => {
    const [requestsRes, paymentsRes] = await Promise.all([
      serviceRequestsAPI.getTenantRequests(user.unique_id),
      financialsAPI.getRentPaymentHistory({ tenant_unique_id: user.unique_id }),
    ]);

    const requests = requestsRes.data.service_requests || [];
    const payments = paymentsRes.data.payments || [];

    setStats({
      totalRequests: requests.length,
      pendingRequests: requests.filter(
        r => r.status === "Open" || r.status === "In Progress"
      ).length,
      completedRequests: requests.filter(r => r.status === "Completed").length,
      totalPayments: payments.length,
    });
  };

  // =================================================
  // FLATS + ML PREDICTION
  // =================================================
  const fetchFlatsWithPredictions = async () => {
    const res = await flatsAPI.listFlats();
    const allFlats = res.data.flats || [];

    // Tenant sees only available flats
    const availableFlats = allFlats.filter(f => !f.is_rented);
    setFlats(availableFlats);

    const preds = {};

    await Promise.all(
      availableFlats.map(async (flat) => {
        try {
          const mlRes = await rentPredictorAPI.predict({
            bedrooms: flat.bedrooms,
            bathrooms: flat.bathrooms,
            area_sqft: flat.area_sqft,
            furnishing: flat.furnishing,
            property_type: flat.property_type,
            address: flat.address
          });

          preds[flat.flat_unique_id] = mlRes.data.predicted_rent;
        } catch {
          preds[flat.flat_unique_id] = null;
        }
      })
    );

    setPredictions(preds);
  };

  // =================================================
  // PRICE LABEL LOGIC
  // =================================================
  const getPriceLabel = (quoted, predicted) => {
    const diff = quoted - predicted;

    if (diff > 8000) return { text: "Overpriced", color: "text-red-600" };
    if (diff < -8000) return { text: "Undervalued", color: "text-blue-600" };
    return { text: "Fair Price", color: "text-green-600" };
  };

  // =================================================
  // IDEAL RENT PREDICTOR
  // =================================================
  const handleIdealPredict = async () => {
    const res = await rentPredictorAPI.predict(idealForm);
    setIdealPrediction(res.data.predicted_rent);
  };

  if (loading) return <Loader />;

  // =================================================
  // DASHBOARD CARDS
  // =================================================
  const cards = [
    { label: 'Total Requests', value: stats.totalRequests, icon: Wrench },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: Wrench },
    { label: 'Completed Requests', value: stats.completedRequests, icon: CheckCircle },
    { label: 'Total Payments', value: stats.totalPayments, icon: DollarSign },
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Tenant Dashboard</h1>

      {/* ========================= */}
      {/* STATS */}
      {/* ========================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-500 text-sm">{card.label}</p>
            <div className="flex justify-between items-center mt-2">
              <p className="text-3xl font-bold">{card.value}</p>
              <card.icon className="text-gray-400" size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* ========================= */}
      {/* AVAILABLE FLATS */}
      {/* ========================= */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Home /> Available Flats
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {flats.map(flat => {
            const predicted = predictions[flat.flat_unique_id];
            if (!predicted) return null;

            const quoted = Number(flat.rent);
            const { text, color } = getPriceLabel(quoted, predicted);

            return (
              <div key={flat.flat_unique_id} className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-lg">{flat.title}</h3>
                <p className="text-gray-500">{flat.address}</p>

                <div className="mt-3 space-y-1">
                  <p>Quoted Rent: <strong>₹{quoted}</strong></p>
                  <p>Predicted Rent: <strong>₹{predicted}</strong></p>
                </div>

                <p className={`mt-2 font-bold ${color}`}>{text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================= */}
{/* IDEAL RENT PREDICTOR */}
{/* ========================= */}
<div className="bg-white p-6 rounded-lg shadow">
  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
    <TrendingUp /> Rent Predictor
  </h2>

  <div className="grid grid-cols-2 gap-4">
    {/* Bedrooms */}
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        Bedrooms (BHK)
      </label>
      <input
        type="number"
        min="1"
        placeholder="e.g. 2"
        value={idealForm.bedrooms}
        onChange={e =>
          setIdealForm({ ...idealForm, bedrooms: e.target.value })
        }
        className="border p-2 rounded w-full"
      />
    </div>

    {/* Bathrooms */}
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        Bathrooms
      </label>
      <input
        type="number"
        min="1"
        placeholder="e.g. 2"
        value={idealForm.bathrooms}
        onChange={e =>
          setIdealForm({ ...idealForm, bathrooms: e.target.value })
        }
        className="border p-2 rounded w-full"
      />
    </div>

    {/* Area */}
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        Area (sq ft)
      </label>
      <input
        type="number"
        min="300"
        placeholder="e.g. 750"
        value={idealForm.area_sqft}
        onChange={e =>
          setIdealForm({ ...idealForm, area_sqft: e.target.value })
        }
        className="border p-2 rounded w-full"
      />
    </div>

    {/* Furnishing */}
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        Furnishing
      </label>
      <select
        value={idealForm.furnishing}
        onChange={e =>
          setIdealForm({ ...idealForm, furnishing: e.target.value })
        }
        className="border p-2 rounded w-full"
      >
        <option>Unfurnished</option>
        <option>Semi-Furnished</option>
        <option>Fully-Furnished</option>
      </select>
    </div>
  </div>

  <button
    onClick={handleIdealPredict}
    className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
  >
    Predict Rent
  </button>

  {idealPrediction && (
    <p className="mt-4 text-lg">
      Estimated Rent: <strong>₹{idealPrediction}</strong>
    </p>
  )}
</div>

    </div>
  );
}
