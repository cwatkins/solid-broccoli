function terminalData() {
  return {
    isMounted: false,
    errorMessage: null,
    readerScreen: "idle",
    // Reader info
    readerId: null,
    readers: [],
    // Payment info
    chargeAmount: null,
    reload() {
      this.chargeAmount = null;
      this.readerScreen = "idle";
    },
    init() {
      fetch("/list-readers")
        .then((response) => response.json())
        .then((response) => {
          let readers = response.readers;
          this.readers = readers;
        });
      setTimeout(() => (this.isMounted = true), 500);
    },
    async createPaymentIntent(amount) {
      const res = await fetch("/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });
      return res.json();
    },
    async processPayment(readerId, paymentIntent) {
      const res = await fetch("/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reader_id: readerId,
          payment_intent_id: paymentIntent,
        }),
      });
      return res.json();
    },
    async simulatePayment(readerId) {
      const res = await fetch("/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reader_id: readerId,
        }),
      });
      return res.json();
    },
    async getReader(readerId) {
      const res = await fetch(`retrieve-terminal-reader?reader_id=${readerId}`);
      return res.json();
    },
    async pollReader(readerId, maxTries = 10, interval = 500) {
      let tries = 0;
      async function execute(resolve, reject) {
        tries++;
        let res = await fetch(`retrieve-terminal-reader?reader_id=${readerId}`);
        res = await res.json();
        if (res.error) {
          return resolve(res);
        } else if (
          res.reader_state.action.status === "succeeded" ||
          res.reader_state.action.status === "failed"
        ) {
          return resolve(res);
        } else if (tries === maxTries) {
          return reject(new Error("Max tries exceeded"));
        } else {
          setTimeout(execute, interval, resolve, reject);
        }
      }
      return new Promise(execute).catch((err) => {
        return {
          error: {
            message: err.message,
          },
        };
      });
    },
    async createPayment() {
      this.errorMessage = null;
      // 1. Create PaymentIntent.
      let { payment_intent_id, error: piError } =
        await this.createPaymentIntent(this.chargeAmount);
      if (piError) {
        this.errorMessage = "Error when creating payment: " + piError.message;
        return;
      }
      // 2. Prompt reader to collect payment.
      const { error: processError } = await this.processPayment(
        this.readerId,
        payment_intent_id
      );
      if (processError) {
        this.errorMessage =
          "Error when prompting reader: " + processError.message;
        return;
      }
      this.readerScreen = "in_progress";
      // 3. Simulate payment if reader is a simulated one.
      let simulateError = null;
      const reader = this.readers.filter((x) => x.id === this.readerId)[0];
      if (reader.device_type.includes("simulated")) {
        const { error } = await this.simulatePayment(this.readerId);
        simulateError = error;
      }
      if (simulateError) {
        this.errorMessage =
          "Error when simulating payment: " + simulateError.message;
        return;
      }
      this.readerScreen = "loading";
      // 4. Poll for the reader's status in any case.
      const { error: pollError } = await this.pollReader(this.readerId);
      if (pollError) {
        this.errorMessage = "Error when polling reader: " + pollError.message;
        return;
      }
      this.readerScreen = "completed";
      // 5. Reset
      setTimeout(() => this.reload(), 2000);
    },
  };
}
