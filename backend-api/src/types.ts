export interface Component {
  service_name: string;
  component_name: string;
  instance_id: string;
  team: string;
  environment: string;
  component_type: string;
  service_namespace: string;
  depends_on: string[];
}

export interface Alert {
  service_name: string;
  component_name: string;
  severity: string;
  message: string;
}
