import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { flatsAPI } from '../../api/endpoints';
import { Home, MapPin, DollarSign, User } from 'lucide-react';
import Loader from '../../components/Loader';

export default function MyFlat() {
  const { user } = useAuth();
  const [flat, setFlat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlat();
  }, []);

  const fetchFlat = async () => {
    try {
      const response = await flatsAPI.listFlats();

      // Backend returns { flats: [...] }
      const flats = response.data.flats || [];

      // Transform backend → UI expected fields
      const formattedFlats = flats.map(f => ({
        flat_unique_id: f.flat_unique_id,
        flat_name: f.title,
        location: f.address,
        rent_amount: f.rent,
        is_rented: f.is_rented,
        tenant_unique_id: f.tenant?.unique_id,
        owner_name: f.owner?.username || "N/A",
      }));

      // Find the flat assigned to this tenant
      const myFlat = formattedFlats.find(
        f => f.is_rented && f.tenant_unique_id === user.unique_id
      );

      setFlat(myFlat);
    } catch (error) {
      console.error("Error fetching flat:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  if (!flat) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Flat</h1>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Home size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Flat Assigned</h3>
          <p className="text-gray-500">You are not currently assigned to any flat</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Flat</h1>

      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-start gap-6">
          <div className="bg-blue-100 p-4 rounded-lg">
            <Home size={48} className="text-blue-600" />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {flat.flat_name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="flex items-center gap-3">
                <MapPin className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-gray-800 font-medium">{flat.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Monthly Rent</p>
                  <p className="text-gray-800 font-medium">${flat.rent_amount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Owner</p>
                  <p className="text-gray-800 font-medium">{flat.owner_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Home className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Rented
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
