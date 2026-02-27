import Dexie from 'dexie';

export const db = new Dexie('AushadhiAI');

db.version(1).stores({
    medicines: 'id, name, generic_name, category, prescription_required',
    orders: 'order_id, patient_id, abha_id, medicine_id, purchase_date, status',
    patients: 'abha_id, patient_id, name',
    sessions: '++id, abha_id, created_at',
});

// Seed medicines data into IndexedDB on first load
export async function seedMedicines(medicinesData) {
    const count = await db.medicines.count();
    if (count === 0 && medicinesData?.length > 0) {
        await db.medicines.bulkPut(medicinesData);
        console.log(`[IndexedDB] Seeded ${medicinesData.length} medicines`);
    }
}

export async function seedOrders(ordersData) {
    const count = await db.orders.count();
    if (count === 0 && ordersData?.length > 0) {
        await db.orders.bulkPut(ordersData);
        console.log(`[IndexedDB] Seeded ${ordersData.length} orders`);
    }
}

export async function searchMedicinesLocal(query) {
    if (!query) return db.medicines.toArray();
    const q = query.toLowerCase();
    return db.medicines
        .filter(m =>
            m.name?.toLowerCase().includes(q) ||
            m.generic_name?.toLowerCase().includes(q) ||
            m.category?.toLowerCase().includes(q)
        )
        .toArray();
}

export async function getPatientOrders(abhaId) {
    return db.orders.where('abha_id').equals(abhaId).toArray();
}

export async function saveOrder(order) {
    return db.orders.put(order);
}

export async function savePatient(patient) {
    return db.patients.put(patient);
}

export async function getPatient(abhaId) {
    return db.patients.where('abha_id').equals(abhaId).first();
}
