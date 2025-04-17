<!-- @format -->

# Inventory Management System

## Project Overview

This is a Flask-based backend system for inventory management, focusing on tracking and managing kits and their components as well as distributors.

## Project Structure

```
flaskCapstone/
├── app/                      # Main application directory
│   ├── api/                  # API route handlers
│   │   ├── __init__.py       # API blueprint initialization
│   │   ├── component_routes.py  # Component-related endpoints
│   │   ├── distributor.py    # Distributor-related endpoints
│   │   ├── export.py         # Data export functionality
│   │   ├── import_data.py    # Data import functionality
│   │   ├── kit_assembly.py   # Kit assembly operations
│   │   ├── kit_routes.py     # Kit-related endpoints
│   │   └── usage_record.py   # Usage tracking
│   ├── __init__.py           # Flask application factory
│   ├── models.py             # Database models
│   └── run.py                # Application entry point
├── logs/                     # Application logs
├── static/                   # Static files (CSS, JS, etc.)
├── templates/                # HTML templates
├── .env                      # Environment variables
├── .gitignore                # Git ignore file
├── readme.md                 # Project documentation
└── requirements.txt          # Python dependencies
```

## Project API Documentation
[API Documentation](API_Documentation.md)

## Installation and Setup

### Prerequisites

- Python 3.8 or higher
- MySQL 5.7 or higher

### Installation Steps

1. Clone the repository 

2. Create a virtual environment and activate it:

```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a schema/database in your MySQL with the name `inventory_db`:

```mysql
CREATE DATABASE inventory_db;
```

5. Create a `.env` file in your root directory, and add this line:

```bash
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/inventory_db
```

Replace `username` and `password` with your MySQL credentials.

6. Run the application:

```bash
python app/run.py
```

I did not explicitly assign a port for Flask. Flask will tell you the backend port in the console. It will look like this:

```bash
[2024-11-26 19:10:17,304] INFO in __init__: Inventory Management System startup
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on http://127.0.0.1:5000
```

## API Testing

The API will be available at `http://127.0.0.1:5000/api`. You can test the endpoints using Postman or any API testing tool.

Except for Postman, you can test the index by adding a suffix `/api` to the given link and opening it in the browser, like this http://127.0.0.1:5000/api. Ideally, you should see Hello World.

## Manual Database Setup

​ I noticed that sometimes the database may fail to create tables, and there is no warning at all. If this happens to you, you can create tables manually in the database. I provide the SQL lines here for reference:

```sql
CREATE TABLE distributor (
                             id VARCHAR(20) PRIMARY KEY,
                             name VARCHAR(255) NOT NULL,
                             email VARCHAR(255) NOT NULL UNIQUE,
                             tel VARCHAR(50) NOT NULL,
                             address VARCHAR(255) NOT NULL,
                             city VARCHAR(100) NOT NULL,
                             contact_person VARCHAR(255) NOT NULL,
                             status VARCHAR(10) NOT NULL DEFAULT 'active',
                             created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE component_usage (
                                 id INT AUTO_INCREMENT PRIMARY KEY,
                                 component_id VARCHAR(20) NOT NULL,
                                 component_type VARCHAR(50) NOT NULL,
                                 kit_id VARCHAR(20),
                                 distributor_id VARCHAR(20),
                                 start_time DATETIME,
                                 end_time DATETIME
#                                  FOREIGN KEY (kit_id) REFERENCES kit(id) ON DELETE SET NULL,
#                                  FOREIGN KEY (distributor_id) REFERENCES distributor(id) ON DELETE SET NULL
);

CREATE TABLE kit (
                     id VARCHAR(20) PRIMARY KEY,
                     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                     updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
                     status VARCHAR(50) DEFAULT 'Available', -- Available, Unavailable, In-use, Other
                     distributor_id VARCHAR(20),
                     distributor_name VARCHAR(255),
                     dispense_date DATETIME,
                     FOREIGN KEY (distributor_id) REFERENCES distributor(id)
);


CREATE TABLE phone (
                       id VARCHAR(20) PRIMARY KEY,
                       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       batch_number VARCHAR(255),
                       model_number VARCHAR(100) NOT NULL,
                       status VARCHAR(50) DEFAULT 'available', -- available, in-kit, refurbishing, scrapped
                       discarded_at DATETIME,
                       kit_id VARCHAR(20),
                       FOREIGN KEY (kit_id) REFERENCES kit(id)
);

CREATE TABLE sim_card (
                          id VARCHAR(20) PRIMARY KEY,
                          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          batch_number VARCHAR(255),
                          model_number VARCHAR(100) NOT NULL,
                          status VARCHAR(50) DEFAULT 'available', -- available, in-kit, refurbishing, scrapped
                          discarded_at DATETIME,
                          kit_id VARCHAR(20),
                          FOREIGN KEY (kit_id) REFERENCES kit(id)
);

CREATE TABLE right_sensor (
                              id VARCHAR(20) PRIMARY KEY,
                              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              batch_number VARCHAR(255),
                              model_number VARCHAR(100) NOT NULL,
                              status VARCHAR(50) DEFAULT 'available', -- available, in-kit, refurbishing, scrapped
                              discarded_at DATETIME,
                              kit_id VARCHAR(20),
                              FOREIGN KEY (kit_id) REFERENCES kit(id)
);

CREATE TABLE left_sensor (
                             id VARCHAR(20) PRIMARY KEY,
                             created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             batch_number VARCHAR(255),
                             model_number VARCHAR(100) NOT NULL,
                             status VARCHAR(50) DEFAULT 'available', -- available, in-kit, refurbishing, scrapped
                             discarded_at DATETIME,
                             kit_id VARCHAR(20),
                             FOREIGN KEY (kit_id) REFERENCES kit(id)
);

CREATE TABLE headphone (
                           id VARCHAR(20) PRIMARY KEY,
                           created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           batch_number VARCHAR(255),
                           model_number VARCHAR(100) NOT NULL,
                           status VARCHAR(50) DEFAULT 'available', -- available, in-kit, refurbishing, scrapped
                           discarded_at DATETIME,
                           kit_id VARCHAR(20),
                           FOREIGN KEY (kit_id) REFERENCES kit(id)
);

CREATE TABLE box (
                     id VARCHAR(20) PRIMARY KEY,
                     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                     batch_number VARCHAR(255),
                     model_number VARCHAR(100) NOT NULL,
                     status VARCHAR(50) DEFAULT 'available', -- available, in-kit, refurbishing, scrapped
                     discarded_at DATETIME,
                     kit_id VARCHAR(20),
                     FOREIGN KEY (kit_id) REFERENCES kit(id)
);


CREATE INDEX idx_component_usage_composite_key
    ON component_usage (component_id, component_type, kit_id, start_time DESC);


```
