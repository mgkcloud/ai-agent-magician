import { runWithTools } from '@cloudflare/ai-utils';

export interface Env {
  AI: any;
}

interface AutomationRequest {
  goal: string;
  screenshot: {
    width: number;
    height: number;
    data: number[];
  };
  elements: Array<{
    localId: number;
    type: string;
    text: string;
    tag: string;
    placeholder: string;
    value: string;
    attributes: Record<string, any>;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  html: string;
}

interface AutomationResponse {
  steps: any[];
  error?: string;
}

interface AutomationStep {
  action: string;
  elementId: number;
  value: string;
  element: any;
}

async function handleGenerateAutomationSteps(args: any, elements: any[]) {
  console.log('Starting handleGenerateAutomationSteps with args:', JSON.stringify(args, null, 2));
  console.log('Number of elements available:', elements.length);
  
  try {
    // Parse steps if they come as a JSON string
    let steps = args.steps;
    if (typeof steps === 'string') {
      try {
        steps = JSON.parse(steps);
      } catch (parseError) {
        console.error('Failed to parse steps:', parseError);
        throw new Error('Invalid steps format');
      }
    }

    console.log('Received steps:', JSON.stringify(steps, null, 2));

    if (!Array.isArray(steps)) {
      console.error('Steps is not an array:', typeof steps);
      throw new Error('Steps must be an array');
    }

    const validatedSteps = steps.map((step, index) => {
      console.log(`Validating step ${index + 1}:`, JSON.stringify(step, null, 2));

      if (!step.action || !step.elementId) {
        console.error('Invalid step missing action or elementId:', step);
        throw new Error(`Invalid step: ${JSON.stringify(step)}`);
      }

      const element = elements.find(el => el.localId === step.elementId);
      if (!element) {
        console.error(`No element found with localId ${step.elementId}`);
        console.log('Available localIds:', elements.map(el => el.localId));
        throw new Error(`Invalid elementId: ${step.elementId}`);
      }

      if (!['click', 'type', 'select'].includes(step.action)) {
        console.error('Invalid action:', step.action);
        throw new Error(`Invalid action: ${step.action}`);
      }

      return {
        action: step.action,
        elementId: step.elementId,
        value: step.value || '',
        element,
      };
    });

    console.log('All steps validated successfully:', JSON.stringify(validatedSteps, null, 2));
    return validatedSteps;
  } catch (error) {
    console.error('Error in handleGenerateAutomationSteps:', error);
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      const data = await request.json() as AutomationRequest;
      const elements = data.elements || [];

      console.log('Processing request with goal:', data.goal);
      console.log('Screenshot dimensions:', data.screenshot?.width, 'x', data.screenshot?.height);
      console.log('Number of elements:', data.elements.length);

      let toolResponse: Response | null = null;

      await runWithTools(
        env.AI,
        '@cf/meta/llama-3.2-11b-vision-instruct',
        {
          messages: [
            {
              role: 'system',
              content: `You are an automation expert that MUST use the generateAutomationSteps tool to generate automation steps.

              IMPORTANT RULES:
              1. Analyze the screenshot and elements to understand the interface
              2. Use the exact localId numbers from the provided elements
              3. Only use "type" action for input fields
              4. Only use "click" action for buttons
              5. Focus on achieving the goal
              6. ALWAYS call the generateAutomationSteps tool
              7. NEVER return steps as text or JSON
              8. NEVER describe the steps in your response
              9. ONLY use the tool to generate steps`
            },
            {
              role: 'user',
              content: `Goal: "${data.goal}"

              Available elements:
              ${elements.map((el) => `- localId: ${el.localId}, type: ${el.type}, text: "${el.text}", tag: ${el.tag}, placeholder: "${el.placeholder || ''}"`).join('\n')}

              Use the generateAutomationSteps tool to create steps that achieve this goal.
              DO NOT describe the steps in text.
              ONLY use the tool to generate steps.`,
              image: data.screenshot.data
            }
          ],
          tools: [
            {
              name: 'generateAutomationSteps',
              description: 'Generate a sequence of automation steps using available elements',
              parameters: {
                type: 'object',
                properties: {
                  steps: {
                    type: 'array',
                    description: 'List of automation steps to execute',
                    items: {
                      type: 'object',
                      properties: {
                        action: {
                          type: 'string',
                          enum: ['click', 'type', 'select'],
                          description: 'The action to perform'
                        },
                        elementId: {
                          type: 'number',
                          description: 'The localId of the element to interact with'
                        },
                        value: {
                          type: 'string',
                          description: 'The value to input (for type actions)'
                        }
                      },
                      required: ['action', 'elementId']
                    }
                  }
                },
                required: ['steps']
              },
              function: async (args: any) => {
                const validatedSteps = await handleGenerateAutomationSteps(args, elements);
                toolResponse = new Response(JSON.stringify({ steps: validatedSteps }), {
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                  },
                });
                return { success: true };
              }
            }
          ],
          max_tokens: 1000,
          temperature: 0.2,
          stream: false
        },
        {}
      );

      if (!toolResponse) {
        console.error('Model did not generate automation steps');
        return new Response(JSON.stringify({ error: 'Failed to generate automation steps' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return toolResponse;
    } catch (error) {
      console.error('Error processing automation request:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
} satisfies ExportedHandler<Env>;
