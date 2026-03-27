import { useState } from "react";
import { restaurantService } from "../api/restaurantService";
import type { CreateRestaurant } from "../features/Restaurants/types";

export default function RestaurantSetupForm() {
    const [form, setForm] = useState<CreateRestaurant>({
        name: '',
        phoneNumber: '',
        mobilePhoneNumber: '',
        email: '',
        city: '',
        district: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await restaurantService.create(form);
            window.location.reload();
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 w-[480px]">

                <h1 className="text-white text-2xl font-bold mb-1">Restoran Bilgileri</h1>
                <p className="text-gray-500 text-sm mb-8">Başlamak için restoran bilgilerini girin</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Restoran Adı</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                            placeholder="Restoran Adı"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Telefon</label>
                            <input
                                type="text"
                                value={form.phoneNumber}
                                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                placeholder="0212 000 00 00"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Cep Telefonu</label>
                            <input
                                type="text"
                                value={form.mobilePhoneNumber}
                                onChange={(e) => setForm({ ...form, mobilePhoneNumber: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                placeholder="0532 000 00 00"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                            placeholder="restoran@mail.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Şehir</label>
                            <input
                                type="text"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                placeholder="İstanbul"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">İlçe</label>
                            <input
                                type="text"
                                value={form.district}
                                onChange={(e) => setForm({ ...form, district: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                                placeholder="Kadıköy"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium"
                    >
                        Kaydet ve Devam Et
                    </button>
                </form>

            </div>
        </div>
    );
}