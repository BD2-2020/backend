# Instructions for backend setup (on Linux):

- Install postgres: 

For Ubuntu:

```
# Create the file repository configuration:
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import the repository signing key:
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update the package lists:
sudo apt-get update

# Install the latest version of PostgreSQL.
# If you want a specific version, use 'postgresql-12' or similar instead of 'postgresql':
sudo apt-get -y install postgresql
```

- Change postgres user account password to `root`

Postgres should have created the default user called 'postgres'.

```
sudo -i
su - postgres
psql \password
```

- Create a database called `postgres` if not already created

```
create database postgres;
```

- Connect to database

```
\connect postgres
```

- Copy and paste the `.sql` script from https://github.com/BD2-2020/rent-a-car-database.

- Start frontend and backend

```
yarn dev
```
in `backend/` directory. This might require downloading dependencies beforehand with `npm install`.

Frontend should open automatically and should be running on localhost:3000, backend should be running on localhost:5000.