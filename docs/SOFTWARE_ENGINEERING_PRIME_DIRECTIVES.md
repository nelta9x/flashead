# Software Engineering Prime Directives

This document defines a **Language-Agnostic Universal Design Philosophy** that is not tied to any specific programming language or framework. Without being bound to any particular paradigm (OOP, Functional, DOD, etc.), strictly adhere to the following guidelines, prioritizing **high cohesion, low coupling, clear data flow, and code predictability** above all else.

---

## Core Process: Plan First (Chain of Thought)

- **Never write code immediately.**
- Before writing any code, explicitly provide a step-by-step analysis and implementation plan (e.g., as a distinct markdown section or detailed comments).
- Your plan MUST clearly address the following and be heavily evaluated against the **[Design Principles & Checklist]** below:
    1. Data flow and the role of each module
    2. Possible edge cases and exceptional scenarios
    3. Test scenarios to verify successful implementation (happy paths and exception cases)
    4. Error handling strategy selection for the module/feature

---

## Design Principles & Checklist

*(Evaluate your plan against these rules before generating code)*

### 1. Module Design & Data Flow

- **Feature-Centric Cohesion:** Organize code with **high cohesion around 'Feature' units**, not merely by type or layer. Keep related data and processing logic physically and logically close together.
- **SSOT (Single Source of Truth):** State management of data must originate from only one source. (e.g., reference the original data rather than duplicating it separately for UI display, or load design data exclusively from a DataManager). Never unnecessarily replicate or fragment state, creating synchronization issues.
- **Limited Module Responsibility:** Each logical unit (module, file, class, etc.) should fundamentally aim for **Single Responsibility**. Even as complexity grows, keep closely related responsibilities to no more than 2, and absolutely prohibit creating monolithic modules (God Objects) with numerous independent responsibilities.
- **Self-Documenting Boundaries:** Every class, struct, or object must include a comment at its declaration that clearly states its purpose and the boundaries of its responsibility. Use the following format as a guideline:
    ```
    Purpose: [What this unit does]
    Boundary: [What this unit does NOT do]
    ```
    This enables both humans and AI to judge whether new functionality belongs in this unit or should be placed elsewhere.

### 2. Scalability & Stability

- **Pragmatic Extension (Open-Closed):** Apply extensions pragmatically to avoid excessive indirection. If the reason for change is the same (e.g., updating core logic or fixing bugs), directly modify the existing code. If the reason is different (e.g., adding a new variation or feature), extend by adding new modules or functions rather than altering existing core behaviors.
- **Maintain Predictability:** When replacing or extending existing functions or modules, never break the original behavior (contract) and return values that the overall system expects. Strictly prevent unexpected side effects.

### 3. Functions & Variables

- **Function Behavior Control:** Functions (methods) should perform a single action as a principle. However, two tightly coupled atomic operations commonly used in multithreaded environments or concurrency control (e.g., lookup and fallback/creation) are exceptionally allowed, as in `GetOrAdd` or `GetOrCreate`. Strictly prohibit mixing 3 or more heterogeneous actions (e.g., data validation + business logic processing + external state update) within a single function.
- **Explicit Interface:** Always explicitly declare the types of function/method parameters and return values, so that users can understand the intent without examining the internal implementation.
- **Favor Immutability:** **Declare all local variables within a function as constants (immutable), except those in loops.** State mutation should occur only where absolutely necessary and be kept to a minimum.

### 4. Validation & Defensive Programming

- **Guard Clauses (Early Return):** Before processing the normal flow, immediately filter out invalid inputs (null, out of range, etc.) or exceptional situations at the top of the function using `return`, `throw`, or `continue`, reducing code depth and complexity.
- **Consistent Error Handling:** Do not arbitrarily mix error handling strategies. During the planning phase, explicitly choose the appropriate strategy for the domain (e.g., Fail-Fast via exceptions, or Graceful Degradation via safe defaults) and apply it consistently across the module or feature. Record the chosen strategy in the project documentation to ensure long-term consistency.
- **Public API Independence:** All externally exposed (Public/Exported) modules and functions must not be excessively coupled to internal implementations, and must be structured to allow independent testing and verification on their own.
