# DeliveryIQ Orchestrator

Build the DeliveryIQ Assessment Runtime Engine as the orchestration layer for the application. Create a complete assessment lifecycle supporting Draft, In Progress, Submitted, Processing, Completed and Archived states. Implement an AssessmentSession model and an AssessmentResponse model with the fields defined above. Create REST endpoints for creating, saving, submitting, retrieving status and retrieving results. Build a responsive assessment landing page with cards for New Assessment, Continue Draft and Completed Assessments. After submission, display a processing screen showing each engine stage (Knowledge Pack, Observations, Signals, Rules, Patterns, Scores, Recommendations and Narrative) progressing sequentially with visual indicators. Persist all assessment data and processing state so a failed run can be retried without losing responses. Structure the orchestration so each engine is an independent service that can later be replaced or extended without changing the runtime controller. Ensure the design follows the existing DeliveryIQ branding, dark theme and ribbon design language, and produces clean, production-ready React/TypeScript code with a scalable folder structure.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://assessment-orchestra.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1645d68f-cf31-4c3f-b1c9-d3f113825977).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
