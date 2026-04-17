"""
Enrich alumni.csv:
- Prefix alumni_major with a real school when it was subject-only (no uni/IIT/etc.).
- Append fintech + other diverse company/profession rows.
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "alumni.csv"
INTERNAL = Path(__file__).resolve().parents[1] / "backend" / "app" / "data" / "alumni.csv"

# If a row already looks tied to a school, do not prefix again (safe for re-runs).
INST = re.compile(
    r"University|IIT\b|IIM\b|NIT\b|BITS|College|Institute|School of|Academy|"
    r"Stanford|MIT\b|Harvard|Oxford|Cambridge|National|Global|VIT\b|SRM|IIIT|"
    r"IISc|ISB|Campus|Polytechnic|ENS |EPFL|KAIST|UC Berkeley|CMU|Georgia Tech|"
    r"LSE\b|Wharton|INSEAD|JNU\b|DU\b|Jadavpur|Christ University|Ashoka|Manipal|"
    r"Anna University|Presidency|Xavier|Law School|NALSAR|NLU\b|JGLS|NUS\b|NTU\b|"
    r"\bSRCC\b|\bNMIMS\b|\bFMS\b|\bXLRI\b|\bISB\b",
    re.I,
)

POOL = [
    "IIT Bombay",
    "IIT Delhi",
    "IIT Madras",
    "IIT Kharagpur",
    "IIT Kanpur",
    "IIT Roorkee",
    "IIT Guwahati",
    "IIT Hyderabad",
    "IIT Indore",
    "IIT BHU Varanasi",
    "IISc Bangalore",
    "IIIT Hyderabad",
    "IIIT Delhi",
    "BITS Pilani",
    "NIT Trichy",
    "NIT Warangal",
    "IIM Ahmedabad",
    "IIM Bangalore",
    "IIM Calcutta",
    "XLRI Jamshedpur",
    "FMS University of Delhi",
    "ISB Hyderabad",
    "Ashoka University",
    "Manipal Institute of Technology",
    "VIT Vellore",
    "SRM Institute of Science and Technology",
    "Anna University",
    "University of Delhi",
    "University of Mumbai",
    "Jadavpur University",
    "Christ University Bangalore",
    "St. Xavier's College Mumbai",
    "National Law School of India University",
    "NALSAR University of Law",
    "OP Jindal Global University",
    "National University of Singapore",
    "Nanyang Technological University",
    "University of Pennsylvania",
    "London School of Economics",
    "University of Cambridge",
]


def enrich_major(major: str, row_index: int) -> str:
    major = (major or "").strip()
    if not major:
        return f"{POOL[row_index % len(POOL)]} — Studies"
    if INST.search(major):
        return major
    inst = POOL[row_index % len(POOL)]
    return f"{inst} — {major}"


def next_alm_id(rows: list[dict]) -> int:
    best = 0
    for r in rows:
        try:
            n = int(r["alumni_id"].split("-")[1])
            best = max(best, n)
        except (IndexError, ValueError):
            continue
    return best + 1


def main_root() -> None:
    with ROOT.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        print("empty csv")
        return
    fieldnames = list(rows[0].keys())

    for i, row in enumerate(rows):
        row["alumni_major"] = enrich_major(row.get("alumni_major", ""), i)

    mx_id = max(int(r["alumni_id"].split("-")[1]) for r in rows)
    nid = mx_id + 1
    # Idempotent: do not duplicate the fintech block if this script was already applied.
    if mx_id >= 334:
        extras: list[tuple] = []
    else:
        extras: list[tuple] = [
        # fintech & payments
        ("Stripe", "Senior Software Engineer", "Dublin, Ireland", "Payments", "Ruby, Go, Distributed systems, PCI"),
        ("Plaid", "Product Manager", "San Francisco, USA", "Product", "APIs, Open banking, Roadmaps, SQL"),
        ("Adyen", "Risk Analyst", "Amsterdam, Netherlands", "Risk", "Fraud models, SQL, AML, KYC"),
        ("Revolut", "Compliance Manager", "London, UK", "Compliance", "Regulatory reporting, MiCA, Policy"),
        ("Chime", "Data Scientist", "San Francisco, USA", "Data & Analytics", "Python, Experimentation, Credit risk"),
        ("Robinhood", "Backend Engineer", "Menlo Park, USA", "Engineering", "Kotlin, Trading systems, Low latency"),
        ("Square (Block)", "Solutions Consultant", "Toronto, Canada", "Sales Engineering", "POS, APIs, Demos"),
        ("Wise", "Treasury Analyst", "London, UK", "Finance", "FX, Liquidity, Excel, Python"),
        ("Klarna", "Growth Marketing Lead", "Stockholm, Sweden", "Marketing", "Performance marketing, SQL, CRM"),
        ("Affirm", "Credit Analyst", "Chicago, USA", "Credit", "Underwriting, BNPL, SAS, Excel"),
        ("SoFi", "Partnerships Lead", "New York, USA", "Business Development", "B2B deals, Fintech partnerships"),
        ("NuBank", "Mobile Engineer", "São Paulo, Brazil", "Engineering", "Kotlin, iOS, Observability"),
        ("Razorpay", "DevRel Engineer", "Bangalore, India", "Engineering", "APIs, Documentation, Community"),
        ("PhonePe", "Product Designer", "Bangalore, India", "Design", "UPI, UX research, Figma"),
        ("Paytm", "Operations Manager", "Noida, India", "Operations", "Merchant ops, SQL, Process design"),
        ("CRED", "Brand Manager", "Bangalore, India", "Marketing", "Campaigns, Partnerships, Creative"),
        ("Zerodha", "Support Lead", "Bangalore, India", "Customer Experience", "Capital markets, KYC, Training"),
        ("Groww", "Content Strategist", "Bangalore, India", "Marketing", "SEO, Personal finance, Video"),
        ("Policybazaar", "Actuarial Analyst", "Gurgaon, India", "Actuarial", "Pricing, R, Excel, Insurance"),
        ("Acko General Insurance", "Claims Manager", "Mumbai, India", "Operations", "Claims, Automation, SQL"),
        ("Pine Labs", "Sales Director", "Noida, India", "Sales", "Enterprise POS, Retail, Negotiation"),
        ("BillDesk", "Integration Engineer", "Mumbai, India", "Engineering", "REST, Webhooks, Banking APIs"),
        ("Jupiter Money", "UX Researcher", "Mumbai, India", "Design", "User interviews, Banking, Figma"),
        ("Slice", "Fraud Investigator", "Bangalore, India", "Risk", "Chargebacks, Rules engines, SQL"),
        ("Open Financial", "Security Engineer", "Singapore", "Engineering", "AppSec, Threat modeling, AWS"),
        ("Mollie", "Finance Controller", "Maastricht, Netherlands", "Finance", "IFRS, FP&A, SaaS metrics"),
        ("Checkout.com", "SRE", "London, UK", "Engineering", "Kubernetes, Observability, Payments uptime"),
        ("SumUp", "HR Business Partner", "Berlin, Germany", "HR", "People ops, Compensation, DEI"),
        ("Toast", "Customer Success Manager", "Boston, USA", "Customer Success", "Restaurants, SaaS, QBR"),
        ("Brex", "Corporate Counsel", "New York, USA", "Legal", "Commercial contracts, Fintech regulatory"),
        ("Mercury", "Finance Ops Analyst", "New York, USA", "Finance", "Banking ops, Reconciliation, SQL"),
        ("Ramp", "Account Executive", "New York, USA", "Sales", "SMB, Expense management, Outbound"),
        ("Monzo", "Data Engineer", "London, UK", "Data & Analytics", "dbt, Snowflake, Airflow, Python"),
        ("Starling Bank", "Mobile Engineer", "London, UK", "Engineering", "Swift, Banking apps, CI/CD"),
        ("N26", "Localization PM", "Berlin, Germany", "Product", "i18n, Roadmaps, Analytics"),
        ("Mollie", "KYC Analyst", "Amsterdam, Netherlands", "Compliance", "EDD, Screening tools, Typologies"),
        ("PayPal", "Machine Learning Engineer", "Chennai, India", "Data & Analytics", "Fraud ML, TensorFlow"),
        ("Goldman Sachs Marquee", "Strats", "New York, USA", "Quant", "Python, Pricing, Derivatives"),
        ("JP Morgan Payments", "Software Engineer", "Bengaluru, India", "Engineering", "Java, ISO20022, APIs"),
        ("Visa", "Network Engineer", "Singapore", "Engineering", "Routing, Protocols, Latency"),
        ("Mastercard", "Cybersecurity Analyst", "Pune, India", "Security", "SIEM, Threat intel, SOC"),
        ("American Express", "Product Owner", "Phoenix, USA", "Product", "Rewards, Agile, Stakeholders"),
        ("Capital One", "Business Analyst", "McLean, USA", "Data & Analytics", "SQL, Cards, Tableau"),
        ("Discover Financial", "Audit Manager", "Chicago, USA", "Audit", "SOX, Controls, Banking"),
        ("Barclays", "Equity Research Associate", "London, UK", "Finance", "Models, Excel, Sector coverage"),
        ("HSBC", "Trade Finance Specialist", "Hong Kong", "Trade Finance", "LCs, Documentary credits"),
        ("DBS Bank", "Relationship Manager", "Singapore", "Commercial Banking", "SME lending, CRM"),
        ("ICICI Bank Digital", "Scrum Master", "Mumbai, India", "Technology", "Agile, Jira, Release trains"),
        ("HDFC Bank", "Branch Manager", "Hyderabad, India", "Retail Banking", "Sales, Ops, Compliance"),
        ("Kotak Mahindra", "Wealth Advisor", "Mumbai, India", "Wealth", "Portfolio, Regulations, CRM"),
        ("Axis Bank", "Credit Manager", "Bangalore, India", "Credit", "SME loans, Financial analysis"),
        ("Yes Bank", "Treasury Dealer", "Mumbai, India", "Treasury", "Money markets, ALM"),
        ("Federal Bank", "IT Architect", "Kochi, India", "Engineering", "Core banking, Cloud migration"),
    ]

    first_names = [
        "Anika", "Vihaan", "Kiara", "Reyansh", "Myra", "Advik", "Sara", "Yash", "Ira", "Neel",
        "Tara", "Dhruv", "Mira", "Kabir", "Anvi", "Rohan", "Pihu", "Ved", "Riya", "Arin",
        "Zayn", "Lina", "Omar", "Nia", "Kai", "Sia", "Leo", "Maya", "Noor", "Raj",
        "Eva", "Ian", "Amy", "Ben", "Uma", "Sid", "Joy", "Ray", "Kim", "Ava",
        "Dan", "Eli", "Fox", "Gia", "Hal", "Ivy", "Jax", "Ken", "Liv", "Max",
    ]
    degrees = ["Bachelor's", "Master's", "Master's", "Bachelor's", "PhD", "Master's"]
    majors_base = [
        "IIT Bombay — Electrical Engineering",
        "IIM Bangalore — Finance",
        "BITS Pilani — Mathematics",
        "SRCC — Economics",
        "NIT Trichy — Computer Science",
        "University of Mumbai — Commerce",
        "National University of Singapore — Business",
        "London School of Economics — Finance",
        "Ashoka University — Economics",
        "IIIT Hyderabad — Computer Science",
        "IIT Madras — Mechanical Engineering",
        "IIT Delhi — Physics",
        "NALSAR — Law",
        "Christ University — Business Administration",
        "Manipal — Information Technology",
    ]

    for j, (co, pos, loc, jr, sk) in enumerate(extras):
        aid = f"ALM-{nid + j:04d}"
        fn = first_names[j % len(first_names)]
        ln = ["Shah", "Verma", "Patel", "Singh", "Reddy", "Iyer", "Menon", "Nair", "Das", "Kapoor"][j % 10]
        name = f"{fn} {ln}"
        gy = 2014 + (j % 10)
        deg = degrees[j % len(degrees)]
        maj = majors_base[j % len(majors_base)]
        email = f"{fn.lower()}.{ln.lower()}{nid+j}@alumni.edu"
        rows.append(
            {
                "alumni_id": aid,
                "alumni_name": name,
                "alumni_graduation_year": str(gy),
                "alumni_degree": deg,
                "alumni_major": maj,
                "alumni_current_company": co,
                "alumni_position": pos,
                "alumni_location": loc,
                "alumni_email": email,
                "job_role": jr,
                "skills": sk,
            }
        )

    with ROOT.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {ROOT} (enriched majors + {len(extras)} new)")


def main_internal() -> None:
    """Append simple-schema rows for local demo CSV."""
    with INTERNAL.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    fn = list(rows[0].keys())
    extra = [
        ("Rohan Mehta", "IIM Ahmedabad", "Razorpay", "Payments, Strategy, SQL", "Bangalore", 6),
        ("Sneha Kulkarni", "NMIMS Mumbai", "CRED", "Growth, CRM, Analytics", "Mumbai", 4),
        ("Vikram Desai", "IIT Roorkee", "PhonePe", "UPI, Backend, Java", "Bangalore", 5),
        ("Ananya Bose", "SRCC Delhi", "Paytm", "Merchant ops, Excel", "Noida", 3),
        ("Karan Malhotra", "BITS Pilani", "Zerodha", "Support, Markets, Compliance", "Bangalore", 4),
        ("Priya Nambiar", "NIT Trichy", "Slice", "Risk, SQL, Rules", "Chennai", 3),
        ("Aditya Sen", "IIT Kharagpur", "Groww", "Content, SEO, Video", "Bangalore", 2),
        ("Meera Iyer", "University of Calcutta", "Policybazaar", "Actuarial, R", "Kolkata", 5),
        ("Nikhil Rao", "IIIT Bangalore", "Jupiter Money", "UX, Research, Figma", "Mumbai", 4),
        ("Divya Pillai", "Anna University", "Federal Bank", "Core banking, Java", "Kochi", 7),
        ("Omar Siddiqui", "IIM Calcutta", "Goldman Sachs", "Strats, Python", "Mumbai", 6),
        ("Lisa Chen", "NUS Singapore", "Wise", "Treasury, FX", "Singapore", 5),
        ("James O'Brien", "LSE", "Revolut", "Compliance, MiCA", "London", 4),
    ]
    for name, col, co, sk, loc, exp in extra:
        rows.append(
            {
                "name": name,
                "college": col,
                "company": co,
                "skills": sk,
                "location": loc,
                "experience": str(exp),
            }
        )
    with INTERNAL.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fn)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {INTERNAL}")


if __name__ == "__main__":
    main_root()
    main_internal()
