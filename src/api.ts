export async function fetchGraphData() {
  try {
    const res = await fetch('http://localhost:3001/graph');
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return import('./sample_service_data.json');
  }
}

export async function fetchAlertData() {
  try {
    const res = await fetch('http://localhost:3001/alerts');
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return import('./sample_alerts.json');
  }
}

