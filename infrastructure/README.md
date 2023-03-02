# infrastructure

See the README in the parent directory.

**NB:** this API has no authentication. If you use this project, it is your
responsibility to add it.

## Usage

Deploy the project:

```bash
# Choose any method of setting AWS credentials
export AWS_PROFILE=...

# Install dependencies
nvm use 18
corepack enable # if not already run
yarn install

# Deploy it!
yarn deploy
```
