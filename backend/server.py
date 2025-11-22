from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import pickle
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

class MLPredictor:
    """
    Machine Learning predictor using polynomial regression for readiness
    and linear regression for success likelihood
    """
    def __init__(self):
        self.readiness_model = None
        self.likelihood_model = None
        self.poly_features = PolynomialFeatures(degree=2)
        self.train_models()

    def train_models(self):
        """
        Train ML models using synthetic data based on domain knowledge
        """
        # Generate training data for READINESS model
        # Features: [income, equity, savings, target, marital_status, kids]
        np.random.seed(42)
        n_samples = 1000

        # Generate diverse training samples
        incomes = np.random.uniform(2000, 15000, n_samples)
        equities = np.random.uniform(0, 200000, n_samples)
        savings = np.random.uniform(0, 2000, n_samples)
        targets = np.random.uniform(100000, 800000, n_samples)
        marital = np.random.randint(0, 2, n_samples)  # 0=single, 1=married
        kids = np.random.randint(0, 5, n_samples)

        # Calculate ground truth using domain logic
        X_readiness = []
        y_readiness = []

        for i in range(n_samples):
            cost_deduction = 400 if marital[i] == 1 else 0
            cost_deduction += kids[i] * 300
            adjusted_income = max(1000, incomes[i] - cost_deduction)
            curr_power = (adjusted_income * 90) + equities[i]
            ratio = curr_power / targets[i]

            # Quadratic readiness with some noise for ML learning
            readiness = 100 if ratio >= 1.0 else max(0, 100 * (ratio ** 2))
            readiness += np.random.normal(0, 2)  # Add small noise
            readiness = np.clip(readiness, 0, 100)

            X_readiness.append([incomes[i], equities[i], savings[i], targets[i],
                              marital[i], kids[i], adjusted_income, curr_power, ratio])
            y_readiness.append(readiness)

        X_readiness = np.array(X_readiness)
        y_readiness = np.array(y_readiness)

        # Train polynomial regression for readiness (captures non-linear relationships)
        X_readiness_poly = self.poly_features.fit_transform(X_readiness)
        self.readiness_model = LinearRegression()
        self.readiness_model.fit(X_readiness_poly, y_readiness)

        # Generate training data for LIKELIHOOD model
        # Features: [income, equity, savings, target, years, rate, marital_status, kids]
        years = np.random.uniform(1, 15, n_samples)
        rates = np.random.uniform(2.0, 8.0, n_samples)

        X_likelihood = []
        y_likelihood = []

        for i in range(n_samples):
            cost_deduction = 400 if marital[i] == 1 else 0
            cost_deduction += kids[i] * 300
            adjusted_income = max(1000, incomes[i] - cost_deduction)

            # Calculate future equity with compound interest
            monthly_rate = (rates[i] / 100) / 12
            months = int(years[i] * 12)
            future_equity = equities[i]

            for _ in range(months):
                future_equity = (future_equity * (1 + monthly_rate)) + savings[i]

            future_power = (adjusted_income * 90) + future_equity
            coverage = future_power / targets[i]

            # Logistic-based likelihood with noise
            likelihood = 100 / (1 + np.exp(-10 * (coverage - 0.85)))
            likelihood = max(10, likelihood)
            if future_power >= targets[i]:
                likelihood = 98
            likelihood += np.random.normal(0, 2)  # Add small noise
            likelihood = np.clip(likelihood, 10, 98)

            X_likelihood.append([incomes[i], equities[i], savings[i], targets[i],
                               years[i], rates[i], marital[i], kids[i],
                               adjusted_income, future_equity, coverage])
            y_likelihood.append(likelihood)

        X_likelihood = np.array(X_likelihood)
        y_likelihood = np.array(y_likelihood)

        # Train linear regression for likelihood
        self.likelihood_model = LinearRegression()
        self.likelihood_model.fit(X_likelihood, y_likelihood)

        print("[OK] ML Models trained successfully!")
        print(f"  Readiness Model R^2 Score: {self.readiness_model.score(X_readiness_poly, y_readiness):.4f}")
        print(f"  Likelihood Model R^2 Score: {self.likelihood_model.score(X_likelihood, y_likelihood):.4f}")

    def predict_readiness(self, income, equity, savings, target, marital, kids):
        """
        Predict current readiness using polynomial regression
        """
        # Calculate derived features
        cost_deduction = 400 if marital == 'married' else 0
        cost_deduction += kids * 300
        adjusted_income = max(1000, income - cost_deduction)
        curr_power = (adjusted_income * 90) + equity
        ratio = curr_power / target if target > 0 else 0

        # Prepare features for prediction
        marital_num = 1 if marital == 'married' else 0
        X = np.array([[income, equity, savings, target, marital_num, kids,
                      adjusted_income, curr_power, ratio]])

        # Transform to polynomial features
        X_poly = self.poly_features.transform(X)

        # Predict
        readiness = self.readiness_model.predict(X_poly)[0]
        readiness = np.clip(readiness, 0, 100)

        return int(readiness), int(curr_power)

    def predict_likelihood(self, income, equity, savings, target, years, rate, marital, kids):
        """
        Predict success likelihood using linear regression
        """
        # Calculate derived features
        cost_deduction = 400 if marital == 'married' else 0
        cost_deduction += kids * 300
        adjusted_income = max(1000, income - cost_deduction)

        # Calculate future equity with compound interest
        monthly_rate = (rate / 100) / 12
        months = int(years * 12)
        future_equity = equity

        for _ in range(months):
            future_equity = (future_equity * (1 + monthly_rate)) + savings

        future_power = (adjusted_income * 90) + future_equity
        coverage = future_power / target if target > 0 else 0

        # Prepare features for prediction
        marital_num = 1 if marital == 'married' else 0
        X = np.array([[income, equity, savings, target, years, rate,
                      marital_num, kids, adjusted_income, future_equity, coverage]])

        # Predict
        likelihood = self.likelihood_model.predict(X)[0]
        likelihood = np.clip(likelihood, 10, 98)

        return int(likelihood), int(future_equity)

# Initialize ML predictor
predictor = MLPredictor()

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint
    Expected JSON payload:
    {
        "income": float,
        "equity": float,
        "savings": float,
        "target": float,
        "years": int,
        "rate": float,
        "marital": str,
        "kids": int
    }
    """
    try:
        data = request.json

        # Extract parameters
        income = float(data.get('income', 0))
        equity = float(data.get('equity', 0))
        savings = float(data.get('savings', 0))
        target = float(data.get('target', 1))
        years = int(data.get('years', 1))
        rate = float(data.get('rate', 5.0))
        marital = data.get('marital', 'single')
        kids = int(data.get('kids', 0))

        # Validate inputs
        if target <= 0:
            return jsonify({'error': 'Target must be greater than 0'}), 400

        # Get predictions
        readiness, curr_power = predictor.predict_readiness(
            income, equity, savings, target, marital, kids
        )

        likelihood, future_equity = predictor.predict_likelihood(
            income, equity, savings, target, years, rate, marital, kids
        )

        # Return predictions
        response = {
            'readiness': readiness,
            'likelihood': likelihood,
            'currPower': curr_power,
            'futureEquity': future_equity,
            'model_info': {
                'readiness_model': 'Polynomial Regression (degree 2)',
                'likelihood_model': 'Linear Regression with feature engineering'
            }
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': True,
        'message': 'ML prediction server is running'
    }), 200

@app.route('/api/retrain', methods=['POST'])
def retrain():
    """Retrain models with new data (optional endpoint)"""
    try:
        predictor.train_models()
        return jsonify({'message': 'Models retrained successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print(">>> Real Good Estate - ML Prediction Server <<<")
    print("="*60)
    print("Using NumPy and Scikit-learn for AI/ML predictions")
    print("Server running on http://localhost:5000")
    print("="*60 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)

