export abstract class TransactionContextBase {
    constructor(
        public readonly txId: string,
        public readonly abortSignal: AbortSignal
    ) {}
}

export abstract class TransactionPrepareResultBase {
    constructor(public readonly stepId: string) {}
}

export abstract class TransactionHandleBase {
    constructor(public readonly stepId: string) {}
}

export abstract class TransactionStep {
    abstract readonly id: string;
    abstract readonly description: string;

    abstract prepare(ctx: TransactionContextBase): Promise<TransactionPrepareResultBase>;

    abstract commit(
        ctx: TransactionContextBase,
        prepared: TransactionPrepareResultBase
    ): Promise<TransactionHandleBase>;

    abstract rollback(ctx: TransactionContextBase, handle: TransactionHandleBase): Promise<void>;
}

export type TransactionSuccessResult = {
    success: true;
    txId: string;
};

export type TransactionFailureResult = {
    success: false;
    txId: string;
    failedStepId: string;
    reason: string;
    error: unknown;
    failedStepRollbackSteps: string[];
};

export type TransactionResult = TransactionSuccessResult | TransactionFailureResult;

export class TransactionFailedError extends Error {
    public readonly txId: string;
    public readonly failedStepId: string;
    public readonly reason: string;
    public readonly error: unknown;
    public readonly failedStepRollbackSteps: string[];

    constructor(
        txId: string,
        failedStepId: string,
        reason: string,
        error: unknown,
        failedStepRollbackSteps: string[]
    ) {
        super(`Transaction ${txId} failed at step ${failedStepId}: ${reason}`);
        this.txId = txId;
        this.failedStepId = failedStepId;
        this.reason = reason;
        this.error = error;
        this.failedStepRollbackSteps = failedStepRollbackSteps;
    }
}

export type StepResult = {
    step: TransactionStep;
    prepared: TransactionPrepareResultBase;
    handle: TransactionHandleBase;
};

async function rollbackAll<Ctx extends TransactionContextBase>(
    ctx: Ctx,
    successfulSteps: StepResult[]
): Promise<void> {
    for (let i = successfulSteps.length - 1; i >= 0; i--) {
        const { step, handle } = successfulSteps[i] ?? {};
        try {
            if (!step || !handle) {
                console.warn(
                    `Skipping rollback for step at index ${i} in transaction ${ctx.txId} due to missing step or handle`
                );
                continue;
            }
            await step?.rollback(ctx, handle);
        } catch (rollbackError) {
            console.error(
                `Failed to rollback step ${step?.id} in transaction ${ctx.txId}:`,
                rollbackError
            );
        }
    }
}

export async function runTransaction<Ctx extends TransactionContextBase>(
    ctx: Ctx,
    steps: TransactionStep[]
): Promise<TransactionResult> {
    if (steps.length === 0) {
        return { success: true, txId: ctx.txId };
    }

    const successfulSteps: StepResult[] = [];

    try {
        for (const step of steps) {
            if (ctx.abortSignal.aborted) {
                throw new Error(`Transaction ${ctx.txId} aborted`);
            }

            try {
                const prepared = await step.prepare(ctx);
                const handle = await step.commit(ctx, prepared);
                successfulSteps.push({ step, prepared, handle });
            } catch (error) {
                await rollbackAll(ctx, successfulSteps);

                return {
                    success: false,
                    txId: ctx.txId,
                    failedStepId: step.id,
                    reason: error instanceof Error ? error.message : 'unknown error',
                    error,
                    failedStepRollbackSteps: successfulSteps.map((s) => s.step.id)
                };
            }
        }
        return {
            success: true,
            txId: ctx.txId
        };
    } catch (error) {
        await rollbackAll(ctx, successfulSteps);

        return {
            success: false,
            txId: ctx.txId,
            failedStepId: error instanceof TransactionFailedError ? error.failedStepId : 'unknown',
            reason:
                error instanceof TransactionFailedError
                    ? error.reason
                    : error instanceof Error
                      ? error.message
                      : 'unknown error',
            error,
            failedStepRollbackSteps: successfulSteps.map((s) => s.step.id)
        };
    }
}
