# Contributing to Quantum Secure Chat

Thank you for your interest in contributing to our Quantum Key Distribution E2EE Chat project!

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inspiring community for all.

### Our Standards
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## How to Contribute

### Reporting Bugs
1. Check if the bug has already been reported in Issues
2. Use the bug report template
3. Include detailed steps to reproduce
4. Provide screenshots if applicable
5. Mention your environment (OS, browser, etc.)

### Suggesting Enhancements
1. Check if the enhancement has been suggested
2. Clearly describe the feature
3. Explain why it would be useful
4. Provide examples of how it would work

### Pull Requests
1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Follow the coding standards (below)
5. Write/update tests if applicable
6. Update documentation
7. Commit your changes (`git commit -m 'feat: add some AmazingFeature'`)
8. Push to the branch (`git push origin feature/AmazingFeature`)
9. Open a Pull Request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/qube-web.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
```

## Coding Standards

### TypeScript/React
- Use TypeScript strict mode
- Follow functional component patterns
- Use hooks appropriately
- Implement proper error boundaries
- Add JSDoc comments for complex functions

### Naming Conventions
- **Components**: PascalCase (e.g., `UserDirectory.tsx`)
- **Services**: PascalCase with Service suffix (e.g., `SessionService.ts`)
- **Functions**: camelCase (e.g., `handleSendMessage`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_MESSAGE_LENGTH`)
- **Interfaces**: PascalCase with descriptive names (e.g., `SessionData`)

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: code restructuring
perf: performance improvements
test: adding or updating tests
chore: maintenance tasks
```

### Code Style
- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in objects/arrays
- Use async/await over promises
- Handle errors properly
- Add comments for complex logic

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── services/      # Business logic and API calls
├── context/       # React context providers
├── firebase/      # Firebase configuration
└── assets/        # Static assets
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Architecture Guidelines

### Services Layer
- Keep business logic separate from UI
- Use singleton pattern for services
- Implement proper error handling
- Add comprehensive logging

### State Management
- Use React Context for global state
- Use local state for component-specific data
- Prefer refs for values that don't trigger re-renders
- Keep state as minimal as possible

### Security
- Never commit sensitive data
- Validate all user inputs
- Sanitize data before encryption
- Follow principle of least privilege
- Implement proper session management

## Documentation

- Update README.md for major features
- Add JSDoc comments for public APIs
- Update CHANGELOG.md for all changes
- Keep security documentation current
- Include code examples where helpful

## Questions?

Feel free to open an issue for:
- Questions about the codebase
- Clarification on contributing process
- Discussion about potential features
- Help with development setup

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
