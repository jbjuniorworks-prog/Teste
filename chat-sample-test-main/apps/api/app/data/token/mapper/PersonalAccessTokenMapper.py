from app.domain.token.model.PersonalAccessToken import PersonalAccessToken
from app.data.token.model.PersonalAccessTokenModel import PersonalAccessTokenModel


class PersonalAccessTokenMapper:
    @staticmethod
    def to_entity(model: PersonalAccessTokenModel) -> PersonalAccessToken:
        return PersonalAccessToken(
            id=model.id,
            user_id=model.user_id,
            prefix=model.prefix,
            created_at=model.created_at,
        )
