import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
const { core: { PayPalHttpClient, SandboxEnvironment, LiveEnvironment }, orders: { OrdersCreateRequest, OrdersCaptureRequest, OrdersGetRequest } } = checkoutNodeJssdk;
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
if (!clientId || !clientSecret) {
    console.warn('PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET');
}
function environment() {
    if (!clientId || !clientSecret) {
        return null;
    }
    const isProduction = process.env.NODE_ENV === 'production';
    return isProduction
        ? new LiveEnvironment(clientId, clientSecret)
        : new SandboxEnvironment(clientId, clientSecret);
}
function client() {
    const env = environment();
    if (!env) {
        return null;
    }
    return new PayPalHttpClient(env);
}
export async function createOrder(params) {
    const paypalClient = client();
    if (!paypalClient) {
        throw new Error('PayPal client not configured');
    }
    const request = new OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
        intent: 'CAPTURE',
        application_context: {
            brand_name: 'AI Documentation Generator',
            landing_page: 'BILLING',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
        },
        purchase_units: [{
                description: params.description,
                amount: {
                    currency_code: params.currency,
                    value: params.amount,
                },
                custom_id: JSON.stringify(params.metadata || {}),
            }],
    });
    try {
        const response = await paypalClient.execute(request);
        const approvalUrl = response.result.links?.find((link) => link.rel === 'approve')?.href;
        return {
            orderId: response.result.id,
            status: response.result.status,
            approvalUrl,
        };
    }
    catch (error) {
        console.error('PayPal create order error:', error);
        throw new Error(`PayPal order creation failed: ${error.message}`);
    }
}
export async function captureOrder(orderId) {
    const paypalClient = client();
    if (!paypalClient) {
        throw new Error('PayPal client not configured');
    }
    const request = new OrdersCaptureRequest(orderId);
    request.requestBody({});
    try {
        const response = await paypalClient.execute(request);
        return {
            orderId: response.result.id,
            status: response.result.status,
            payerId: response.result.payer?.payer_id,
            payerEmail: response.result.payer?.email_address,
            amount: response.result.purchase_units[0]?.payments?.captures[0]?.amount,
            customId: response.result.purchase_units[0]?.custom_id,
        };
    }
    catch (error) {
        console.error('PayPal capture order error:', error);
        throw new Error(`PayPal order capture failed: ${error.message}`);
    }
}
export async function getOrder(orderId) {
    const paypalClient = client();
    if (!paypalClient) {
        throw new Error('PayPal client not configured');
    }
    const request = new OrdersGetRequest(orderId);
    try {
        const response = await paypalClient.execute(request);
        return response.result;
    }
    catch (error) {
        console.error('PayPal get order error:', error);
        throw new Error(`PayPal get order failed: ${error.message}`);
    }
}
