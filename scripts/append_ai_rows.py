"""One-off append of demo AI alumni + contrast rows. Run from repo root."""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "alumni.csv"

entries = [
    ("ALM-0251", "Aarav Menon", 2021, "Master's", "Stanford University", "OpenAI", "Member of Technical Staff", "San Francisco, USA", "aarav.m2021@alumni.edu", "AI Research Engineer", "LLMs, RLHF, PyTorch, Transformers, Python"),
    ("ALM-0252", "Isha Kulkarni", 2020, "Master's", "Carnegie Mellon University", "Anthropic", "Research Engineer", "San Francisco, USA", "isha.k2020@alumni.edu", "ML Engineer", "Constitutional AI, Claude, JAX, Python"),
    ("ALM-0253", "Rohan Das", 2019, "PhD", "University of Cambridge", "Google DeepMind", "Senior Software Engineer", "London, UK", "rohan.d2019@alumni.edu", "ML Engineer", "JAX, TPU, Neural Architecture Search"),
    ("ALM-0254", "Meera Shah", 2018, "Master's", "MIT", "Meta", "Research Scientist", "Menlo Park, USA", "meera.s2018@alumni.edu", "AI Scientist", "LLMs, Computer Vision, PyTorch"),
    ("ALM-0255", "Karan Verma", 2022, "Master's", "Georgia Institute of Technology", "Amazon AWS", "Applied Scientist", "Seattle, USA", "karan.v2022@alumni.edu", "Applied Scientist ML", "Forecasting, SageMaker, XGBoost, Python"),
    ("ALM-0256", "Ananya Ghosh", 2017, "PhD", "University of Washington", "Microsoft Research", "Principal Researcher", "Redmond, USA", "ananya.g2017@alumni.edu", "ML Research", "Transformers, NLP, Azure ML"),
    ("ALM-0257", "Vikram Naidu", 2019, "Master's", "UC Berkeley", "NVIDIA", "Deep Learning Engineer", "Santa Clara, USA", "vikram.n2019@alumni.edu", "CUDA ML Engineer", "TensorRT, ONNX, GPU kernels"),
    ("ALM-0258", "Sana Qureshi", 2021, "Master's", "EPFL", "Hugging Face", "ML Engineer", "Paris, France", "sana.q2021@alumni.edu", "Open Source ML", "Transformers, Datasets, PEFT"),
    ("ALM-0259", "Arnav Patel", 2020, "Master's", "University of Toronto", "Cohere", "ML Engineer", "Toronto, Canada", "arnav.p2020@alumni.edu", "NLP Engineer", "Retrieval, Embeddings, LLMs"),
    ("ALM-0260", "Diya Sen", 2022, "Master's", "ENS Paris", "Mistral AI", "Research Engineer", "Paris, France", "diya.s2022@alumni.edu", "LLM Research", "MoE, Training at scale"),
    ("ALM-0261", "Kabir Joshi", 2018, "Master's", "UT Austin", "Apple ML", "ML Engineer", "Cupertino, USA", "kabir.j2018@alumni.edu", "On-Device ML", "CoreML, Neural Engine, Privacy ML"),
    ("ALM-0262", "Nisha Rao", 2019, "Master's", "UC San Diego", "Databricks", "ML Engineer", "San Francisco, USA", "nisha.r2019@alumni.edu", "Lakehouse ML", "Spark, MLflow, Delta Lake"),
    ("ALM-0263", "Aditya Pillai", 2020, "Master's", "University of Wisconsin", "Snowflake", "AI Engineer", "Bozeman, USA", "aditya.p2020@alumni.edu", "GenAI SQL", "Cortex, LLM SQL"),
    ("ALM-0264", "Riya Thomas", 2017, "PhD", "Caltech", "Adobe Research", "Research Scientist", "San Jose, USA", "riya.t2017@alumni.edu", "Generative AI", "Diffusion, Creative ML"),
    ("ALM-0265", "Manoj Iyer", 2016, "Master's", "Columbia University", "Salesforce", "Principal ML Engineer", "San Francisco, USA", "manoj.i2016@alumni.edu", "Einstein GPT", "CRM LLMs, Fine-tuning"),
    ("ALM-0266", "Pooja Nair", 2021, "Master's", "Purdue University", "Intel AI", "ML Engineer", "Hillsboro, USA", "pooja.n2021@alumni.edu", "Model Optimization", "Quantization, OpenVINO"),
    ("ALM-0267", "Suresh Babu", 2018, "Master's", "UC San Diego", "Qualcomm", "AI Engineer", "San Diego, USA", "suresh.b2018@alumni.edu", "On-Device AI", "SNPE, Mobile Vision"),
    ("ALM-0268", "Lakshmi Hari", 2019, "Master's", "KAIST", "Samsung Research", "Staff Engineer", "Seoul, South Korea", "lakshmi.h2019@alumni.edu", "Vision ML", "On-device CV"),
    ("ALM-0269", "Ethan Wu", 2020, "Master's", "Stanford University", "LinkedIn", "Senior ML Engineer", "Sunnyvale, USA", "ethan.w2020@alumni.edu", "Feed Ranking", "GNNs, Recommendations"),
    ("ALM-0270", "Olivia Park", 2017, "PhD", "Princeton University", "Netflix", "Senior ML Scientist", "Los Gatos, USA", "olivia.p2017@alumni.edu", "Recommendations", "Bandits, Causal inference"),
    ("ALM-0271", "Harsh Malik", 2019, "Master's", "IIT Delhi", "Uber", "ML Engineer", "San Francisco, USA", "harsh.m2019@alumni.edu", "ETA Forecasting", "Geospatial ML"),
    ("ALM-0272", "Tara Singh", 2021, "Master's", "Trinity College Dublin", "Stripe", "ML Engineer", "Dublin, Ireland", "tara.s2021@alumni.edu", "Fraud Detection", "Gradient boosting, Real-time"),
    ("ALM-0273", "Neil Kapoor", 2018, "Master's", "NYU", "JPMorgan AI Research", "Associate", "New York, USA", "neal.k2018@alumni.edu", "Quant ML", "Time series, NLP, Finance"),
    ("ALM-0274", "Zara Khan", 2016, "PhD", "Oxford University", "Goldman Sachs", "VP ML Engineering", "New York, USA", "zara.k2016@alumni.edu", "Trading ML", "Low latency models"),
    ("ALM-0275", "Kiran S", 2020, "Master's", "SRM Institute of Science and Technology", "Freshworks", "AI Engineer", "Chennai, India", "kiran.s2020@alumni.edu", "AI Engineer", "LLMs, PyTorch, NLP, GenAI"),
    ("ALM-0276", "Fatima R", 2019, "Bachelor's", "SRM University", "Zoho", "ML Engineer", "Chennai, India", "fatima.r2019@alumni.edu", "ML Engineer", "TensorFlow, MLOps, Computer Vision"),
    ("ALM-0277", "Gautham L", 2018, "Master's", "IIT Madras", "Google India", "Applied AI Engineer", "Chennai, India", "gautham.l2018@alumni.edu", "AI Engineer", "Deep Learning, NLP, Research"),
    ("ALM-0278", "Bhavya T", 2021, "Master's", "IIT Bombay", "Microsoft India", "ML Platform Engineer", "Mumbai, India", "bhavya.t2021@alumni.edu", "ML Engineer", "Kubernetes, Ray, MLflow"),
    ("ALM-0279", "Ravi Krishnan", 2019, "Bachelor's", "Civil Engineering", "Larsen Toubro", "Site Engineer", "Mumbai, India", "ravi.k2019@alumni.edu", "Site Engineer", "Surveying, QA, Concrete, AutoCAD"),
    ("ALM-0280", "Neha Bose", 2018, "Bachelor's", "Electronics Engineering", "Samsung Semiconductor", "Hardware Engineer", "Bangalore, India", "neha.b2018@alumni.edu", "Hardware Engineer", "SystemVerilog, UVM, RTL"),
    ("ALM-0281", "Arun Menon", 2017, "Bachelor's", "Civil Engineering", "Bechtel", "Civil Engineer", "Houston, USA", "arun.m2017@alumni.edu", "Structural Engineer", "STAAD, SAP2000, Structural design"),
]

def main() -> None:
    with CSV.open("a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        for row in entries:
            w.writerow(row)
    print(f"Appended {len(entries)} rows to {CSV}")


if __name__ == "__main__":
    main()
