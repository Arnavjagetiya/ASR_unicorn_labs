import os
import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()

from datacollective import load_dataset

dataset = load_dataset("cmqim2hn800ssnr07gvmpcnwu")

print("Columns:", dataset.columns.tolist())
print("\nShape:", dataset.shape)
print("\nFirst row:\n", dataset.head(1))

# If there's an accent-like column, show its unique values so we get exact match strings
for col in dataset.columns:
    if "accent" in col.lower():
        print(f"\nUnique values in '{col}':")
        print(dataset[col].value_counts().head(20))