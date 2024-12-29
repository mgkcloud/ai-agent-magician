export interface AutomationStep {
  action: 'click' | 'type' | 'select';
  elementId: number;
  value?: string;
  element: {
    localId: number;
    type: string;
    text: string;
    tag: string;
    placeholder: string;
    value: string;
    attributes: {
      type: string;
      class: string;
      style: {
        position: string;
        display: string;
        visibility: string;
      }
    };
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  }
}

export interface AutomationRequest {
  screenshot: string; // base64 encoded image
  goal: string;
  html: string; // HTML structure with data-local-id attributes
}

export interface ElementInfo {
  localId: number;
  type: string;
  text: string;
  tag: string;
  placeholder: string;
  value: string;
  attributes: {
    type: string;
    class: string;
    style: {
      position: string;
      display: string;
      visibility: string;
    }
  };
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
}

export interface AutomationResponse {
  steps: AutomationStep[];
  error?: string;
}
