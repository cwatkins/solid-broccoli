#! /usr/bin/env python3.6
"""
server.py
Stripe Sample.
Python 3.6 or newer required.
"""

import stripe
import os

from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
stripe.api_version = "2020-08-27;terminal_server_driven_beta=v1"

static_dir = str(os.path.abspath(os.path.join("..", os.getenv("STATIC_DIR"))))
app = Flask(__name__,
            static_folder=static_dir,
            static_url_path="",
            template_folder=static_dir)


@app.route('/', methods=['GET'])
def index():
    readers_list = stripe.terminal.Reader.list(limit=3)
    return render_template(
        'index.html',
        readers=readers_list,
    )


@app.route("/create-payment", methods=['POST'])
def create_payment_intent():
    try:
        # amount = request.get_json().get('amount')
        payment_intent = stripe.PaymentIntent.create(
            amount=1099,
            currency="usd",
            payment_method_types=["card_present"],
            capture_method="manual")
        return jsonify({'payment_intent_id': payment_intent.id})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/process-payment", methods=['POST'])
def process_payment_intent():
    try:
        request_json = request.get_json()
        payment_intent_id, reader = request_json.get(
            'payment_intent_id'), request_json.get('reader_id')
        reader_state = stripe.terminal.Reader.process_payment_intent(
            reader,
            payment_intent=payment_intent_id,
        )
        return jsonify({'reader_state': reader_state})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/simulate-payment", methods=['POST'])
def simulate_terminal_payment():
    try:
        reader_id = request.get_json().get('reader_id')
        reader = stripe.test_helpers.SimulatedReader.simulate_payment(
            reader_id)
        return jsonify({'reader_state': reader})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/retrieve-terminal-reader", methods=['GET'])
def retrieve_reader():
    try:
        reader_id = request.args.get("reader_id")
        reader_state = stripe.terminal.Reader.retrieve(reader_id)
        return jsonify({"reader_state": reader_state})
    except Exception as e:
        return jsonify({"error": {"message": str(e)}})


@app.route("/capture-payment", methods=['POST'])
def capture_payment_intent():
    try:
        payment_intent_id = request.get_json().get('payment_intent_id')
        payment_intent = stripe.PaymentIntent.capture(payment_intent_id)
        return jsonify({'payment_intent': payment_intent})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


@app.route("/cancel-action", methods=['POST'])
def cancel_action():
    try:
        request_json = request.get_json()
        reader = request_json.get('reader_id')
        reader_state = stripe.terminal.Reader.cancel_action(reader)
        return jsonify({'reader_state': reader_state})
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 400


if __name__ == '__main__':
    app.run(port=4111, debug=True)
