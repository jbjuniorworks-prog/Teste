from typing import Annotated

from fastapi import Depends

from app.domain.token.usecase.IssueTokenUseCase import IssueTokenUseCase
from app.domain.token.usecase.GetMyTokenUseCase import GetMyTokenUseCase
from app.domain.token.usecase.DeleteMyTokenUseCase import DeleteMyTokenUseCase
from app.domain.token.usecase.IssueEphemeralTokenUseCase import (
    IssueEphemeralTokenUseCase,
)
# the token repo/hasher/store became cross-feature (auth uses them too) -> they live in the core.
from app.core.dependencies import (
    PatRepositoryDep,
    TokenHasherDep,
    EphemeralTokenStoreDep,
)


def get_issue_token_usecase(
    tokens: PatRepositoryDep,
    hasher: TokenHasherDep,
) -> IssueTokenUseCase:
    return IssueTokenUseCase(tokens, hasher)


IssueTokenUseCaseDep = Annotated[IssueTokenUseCase, Depends(get_issue_token_usecase)]


def get_my_token_usecase(tokens: PatRepositoryDep) -> GetMyTokenUseCase:
    return GetMyTokenUseCase(tokens)


GetMyTokenUseCaseDep = Annotated[GetMyTokenUseCase, Depends(get_my_token_usecase)]


def get_delete_my_token_usecase(tokens: PatRepositoryDep) -> DeleteMyTokenUseCase:
    return DeleteMyTokenUseCase(tokens)


DeleteMyTokenUseCaseDep = Annotated[
    DeleteMyTokenUseCase, Depends(get_delete_my_token_usecase)
]


# Ready for the in-app agent: mints the ephemeral token from the session (server-side).
def get_issue_ephemeral_token_usecase(
    store: EphemeralTokenStoreDep,
    hasher: TokenHasherDep,
) -> IssueEphemeralTokenUseCase:
    return IssueEphemeralTokenUseCase(store, hasher)


IssueEphemeralTokenUseCaseDep = Annotated[
    IssueEphemeralTokenUseCase, Depends(get_issue_ephemeral_token_usecase)
]
