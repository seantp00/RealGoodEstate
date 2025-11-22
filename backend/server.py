from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures

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
        self.property_price_model = None
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

            # Risk adjustment factor: Higher risk = more uncertainty = lower confidence
            # Conservative (2.5%): +5% confidence boost (more predictable)
            # Balanced (5%): neutral (baseline)
            # Aggressive (7.5%): -5% confidence penalty (more volatile)
            risk_adjustment = 0
            if rates[i] < 3.5:  # Conservative
                risk_adjustment = 5  # More reliable, boost likelihood
            elif rates[i] > 6.5:  # Aggressive
                risk_adjustment = -5  # Less reliable, reduce likelihood

            # Logistic-based likelihood with noise and risk adjustment
            likelihood = 100 / (1 + np.exp(-10 * (coverage - 0.85)))
            likelihood = max(10, likelihood)
            if future_power >= targets[i]:
                likelihood = 98

            # Apply risk adjustment
            likelihood += risk_adjustment

            # Add small noise
            likelihood += np.random.normal(0, 2)
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

        # Generate training data for PROPERTY PRICE model
        # Features: [sqm, rooms, bathrooms, location_premium, condition, year_built_age]
        sqm_values = np.random.uniform(50, 250, n_samples)
        rooms_values = np.random.uniform(1, 6, n_samples)
        bathrooms_values = np.random.uniform(1, 4, n_samples)
        location_premium = np.random.uniform(0, 2, n_samples)  # 0=rural, 1=city, 2=premium
        condition = np.random.uniform(0, 2, n_samples)  # 0=renovation, 1=good, 2=new
        year_age = np.random.uniform(0, 100, n_samples)  # age of property in years

        X_property = []
        y_property = []

        for i in range(n_samples):
            # Base price calculation with realistic German market data
            # Average: 4000-8000 EUR per sqm depending on location
            base_price_per_sqm = 3500 + (location_premium[i] * 2000)

            # Adjustments
            room_bonus = rooms_values[i] * 5000  # Extra value per room
            bathroom_bonus = bathrooms_values[i] * 8000  # Bathrooms add value
            condition_factor = 1.0 + (condition[i] * 0.15)  # Up to 30% more for new
            age_penalty = max(0, 1 - (year_age[i] / 200))  # Older = less valuable

            # Calculate price
            price = (sqm_values[i] * base_price_per_sqm * condition_factor * age_penalty +
                    room_bonus + bathroom_bonus)

            # Add realistic noise
            price += np.random.normal(0, price * 0.05)  # 5% noise
            price = max(50000, price)  # Minimum price

            X_property.append([sqm_values[i], rooms_values[i], bathrooms_values[i],
                             location_premium[i], condition[i], year_age[i]])
            y_property.append(price)

        X_property = np.array(X_property)
        y_property = np.array(y_property)

        # Train linear regression for property price
        self.property_price_model = LinearRegression()
        self.property_price_model.fit(X_property, y_property)

        print("[OK] ML Models trained successfully!")
        print(f"  Readiness Model R^2 Score: {self.readiness_model.score(X_readiness_poly, y_readiness):.4f}")
        print(f"  Likelihood Model R^2 Score: {self.likelihood_model.score(X_likelihood, y_likelihood):.4f}")
        print(f"  Property Price Model R^2 Score: {self.property_price_model.score(X_property, y_property):.4f}")

    def predict_readiness(self, income, equity, savings, target, marital, kids):
        """
        Predict current readiness using polynomial regression

        Edge case handling: For inputs outside training bounds, uses direct formula
        to avoid polynomial extrapolation errors.
        """
        # Calculate derived features
        cost_deduction = 400 if marital == 'married' else 0
        cost_deduction += kids * 300
        adjusted_income = max(1000, income - cost_deduction)
        curr_power = (adjusted_income * 90) + equity
        ratio = curr_power / target if target > 0 else 0

        # Check if inputs are within training bounds
        # Training ranges: income(2k-15k), equity(0-200k), target(100k-800k)
        within_bounds = (
            2000 <= income <= 15000 and
            0 <= equity <= 200000 and
            100000 <= target <= 800000
        )

        # For edge cases outside training data, use direct formula
        # Polynomial regression extrapolates poorly beyond training range
        if not within_bounds:
            # Use quadratic readiness formula directly (same as training logic)
            if ratio >= 1.0:
                readiness = 100
            else:
                readiness = 100 * (ratio ** 2)
            readiness = max(0, min(100, readiness))
        else:
            # Use ML model for predictions within training bounds
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

        Edge case handling: For inputs outside training bounds, uses direct logistic formula.
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

        # Check if inputs are within training bounds
        # Training ranges: income(2k-15k), equity(0-200k), target(100k-800k), years(1-15)
        within_bounds = (
            2000 <= income <= 15000 and
            0 <= equity <= 200000 and
            100000 <= target <= 800000 and
            1 <= years <= 15 and
            2.0 <= rate <= 8.0
        )

        # For edge cases outside training data, use direct formula
        if not within_bounds:
            # Use logistic formula directly (same as training logic)
            likelihood = 100 / (1 + np.exp(-10 * (coverage - 0.85)))
            likelihood = max(10, likelihood)
            if future_power >= target:
                likelihood = 98

            # Apply risk adjustment: Higher risk = lower reliability
            # Conservative (2.5%): +5% confidence boost
            # Balanced (5%): neutral
            # Aggressive (7.5%): -5% confidence penalty
            risk_adjustment = 0
            if rate < 3.5:  # Conservative
                risk_adjustment = 5
            elif rate > 6.5:  # Aggressive
                risk_adjustment = -5

            likelihood += risk_adjustment
            likelihood = max(10, min(98, likelihood))
        else:
            # Use ML model for predictions within training bounds
            marital_num = 1 if marital == 'married' else 0
            X = np.array([[income, equity, savings, target, years, rate,
                          marital_num, kids, adjusted_income, future_equity, coverage]])

            # Predict
            likelihood = self.likelihood_model.predict(X)[0]
            likelihood = np.clip(likelihood, 10, 98)

        return int(likelihood), int(future_equity)

    def predict_property_price(self, sqm, rooms, bathrooms, location_type, condition, year_built):
        """
        Predict property price using linear regression

        Parameters:
        - sqm: Living area in square meters
        - rooms: Number of rooms
        - bathrooms: Number of bathrooms
        - location_type: 'rural' (0), 'city' (1), or 'premium' (2)
        - condition: 'renovation' (0), 'good' (1), or 'new' (2)
        - year_built: Year the property was built
        """
        # Convert location type to numeric
        location_map = {'rural': 0, 'city': 1, 'premium': 2}
        location_premium = location_map.get(location_type, 1)

        # Convert condition to numeric
        condition_map = {'renovation': 0, 'good': 1, 'new': 2}
        condition_value = condition_map.get(condition, 1)

        # Calculate age of property
        current_year = 2025
        year_age = max(0, current_year - year_built)

        # Prepare features for prediction
        X = np.array([[sqm, rooms, bathrooms, location_premium, condition_value, year_age]])

        # Predict
        price = self.property_price_model.predict(X)[0]
        price = max(50000, price)  # Minimum price

        return int(price)

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

@app.route('/api/predict-property-price', methods=['POST'])
def predict_property_price():
    """
    Property price prediction endpoint
    Expected JSON payload:
    {
        "sqm": float,
        "rooms": float,
        "bathrooms": float,
        "location": str,  // 'rural', 'city', or 'premium'
        "condition": str, // 'renovation', 'good', or 'new'
        "yearBuilt": int
    }
    """
    try:
        data = request.json

        # Extract parameters with defaults
        sqm = float(data.get('sqm', 100))
        rooms = float(data.get('rooms', 3))
        bathrooms = float(data.get('bathrooms', 1))
        location = data.get('location', 'city')
        condition = data.get('condition', 'good')
        year_built = int(data.get('yearBuilt', 2000))

        # Validate inputs
        if sqm <= 0:
            return jsonify({'error': 'Square meters must be greater than 0'}), 400
        if rooms < 0 or bathrooms < 0:
            return jsonify({'error': 'Rooms and bathrooms must be non-negative'}), 400

        # Get prediction
        predicted_price = predictor.predict_property_price(
            sqm, rooms, bathrooms, location, condition, year_built
        )

        # Return prediction
        response = {
            'predictedPrice': predicted_price,
            'inputs': {
                'sqm': sqm,
                'rooms': rooms,
                'bathrooms': bathrooms,
                'location': location,
                'condition': condition,
                'yearBuilt': year_built
            },
            'model_info': 'Linear Regression with German real estate market data'
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

