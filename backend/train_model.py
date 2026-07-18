import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib
import os


#  Load CSV 

csv_path = "../dataset/training_data.csv"
data = pd.read_csv(csv_path)

print("Loaded dataset:")
print(data.head())


X = data["prompt"]               # user text
y = data["game_type"]            # label to predict (shooter/runner/racing)


vectorizer = TfidfVectorizer()
X_vectors = vectorizer.fit_transform(X)


model = MultinomialNB()
model.fit(X_vectors, y)

print("\nTraining Completed Successfully!")
print("Model Accuracy (training only):", model.score(X_vectors, y))


#  Save model + vectorizer

model_dir = "../models"

if not os.path.exists(model_dir):
    os.makedirs(model_dir)

joblib.dump(model, f"{model_dir}/text_classifier.pkl")
joblib.dump(vectorizer, f"{model_dir}/vectorizer.pkl")

print("\nSaved model files:")
print(" - models/text_classifier.pkl")
print(" - models/vectorizer.pkl")
