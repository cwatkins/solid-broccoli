document.addEventListener("DOMContentLoaded", async () => {
  let readerId;
  let paymentIntentId;

  // Event listener for checkout button
  let checkoutButton = document.getElementById("checkout-button");
  checkoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    messageClear();
    checkoutButton.disabled = true;

    // 1. Create PaymentIntent
    let { payment_intent_id, error: piError } = await fetch("/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }).then((r) => r.json());
    if (piError) {
      checkoutButton.disabled = false;
      return handleError(piError);
    }
    paymentIntentId = payment_intent_id;
    addMessage(`Created Payment Intent: ${paymentIntentId}!`);

    // 2. Get currently selected reader
    let reader = document.querySelector("input[name='reader-options']:checked");
    readerId = reader.value;
    addMessage(`Selected reader: ${readerId}.`);

    // 3. Reader to collect payment.
    const { error: processError } = await fetch("/process-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reader_id: readerId,
        payment_intent_id: paymentIntentId,
      }),
    }).then((res) => res.json());
    if (processError) {
      checkoutButton.disabled = false;
      return handleError(processError);
    }
    addMessage(`Prompting ${readerId} for payment for ${paymentIntentId}...`);

    // 4. Simulate payment if it's a simulated reader.
    const simulated = reader.dataset.deviceType.includes("simulated");
    if (simulated) {
      const { error: simulatedError } = await fetch("/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reader_id: readerId,
        }),
      }).then((res) => res.json());
      if (simulatedError) {
        checkoutButton.disabled = false;
        return handleError();
      }
      addMessage(`Simulated payment for simulated reader ${readerId}`);
    }
  });

  // Event listener for capture button
  let captureButton = document.getElementById("capture-button");
  captureButton.addEventListener("click", async (event) => {
    event.preventDefault();
    captureButton.disabled = true;
    if (!paymentIntentId) {
      addMessage(
        `No PaymentIntent. Click 'Pay' to create one before attempting capture.`
      );
      return;
    }

    const { payment_intent, error: captureError } = await fetch(
      "/capture-payment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
        }),
      }
    ).then((res) => res.json());
    if (captureError) {
      captureButton.disabled = false;
      return handleError(captureError);
    }
    addMessage(`Captured ${paymentIntentId} on reader ${readerId}`);
    addMessage(JSON.stringify(payment_intent, null, 2));
    checkoutButton.disabled = false;
    captureButton.disabled = false;
  });

  // Event listener for cancel button
  let cancelButton = document.getElementById("cancel-button");
  cancelButton.addEventListener("click", async (event) => {
    event.preventDefault();
    cancelButton.disabled = true;

    let reader = document.querySelector("input[name='reader-options']:checked");
    readerId = reader.value;

    const { reader_state, error: cancelError } = await fetch("/cancel-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reader_id: readerId,
      }),
    }).then((res) => res.json());
    if (cancelError) {
      cancelButton.disabled = false;
      return handleError(cancelError);
    }
    addMessage(`Action canceled on ${readerId}`);
    addMessage(`${JSON.stringify(reader_state, null, 2)}`);
    cancelButton.disabled = false;
  });
});
